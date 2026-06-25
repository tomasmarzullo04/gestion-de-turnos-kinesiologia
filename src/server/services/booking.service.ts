import {
  CANCELLATION_MIN_HOURS,
  ROLES,
  TIMEZONE,
  type Role,
} from "@/lib/constants";
import {
  REHAB_FIRST_TIME_MESSAGE,
  REHAB_SLUG,
  isRehabFirstTimeSlotAllowed,
} from "@/lib/rehab-first-time";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { BusinessError } from "@/server/errors";

/**
 * Capa de servicio de reservas — LO CRÍTICO.
 *
 * La reserva y la cancelación NUNCA leen cupos y luego escriben desde la app:
 * delegan en las funciones atómicas de Postgres `book_slot` / `cancel_booking`
 * (vía $queryRaw), que resuelven la concurrencia dentro de una transacción.
 * Esto evita sobre-reservas ante clics simultáneos.
 *
 * Las funciones señalan condiciones de negocio con errores cuyo texto contiene
 * un código conocido; acá los traducimos a mensajes claros en español y nunca
 * exponemos el error crudo de Postgres.
 */

// Código que lanza la función (en el mensaje) → mensaje para el usuario.
const ERROR_MESSAGES = {
  SLOT_FULL: "Esa franja se quedó sin cupos. Probá con otro horario.",
  ALREADY_BOOKED: "Ya tenés una reserva en esa franja.",
  SLOT_NOT_FOUND: "La franja no existe o fue eliminada.",
  SLOT_BLOCKED: "Esa franja está cerrada y no admite reservas.",
  BOOKING_NOT_FOUND: "No encontramos la reserva.",
  FORBIDDEN: "No tenés permiso para esta acción.",
} as const;

/** Traduce un error de Postgres a un BusinessError con mensaje claro. */
function rethrowAsBusiness(error: unknown): never {
  const parts: string[] = [];
  if (error && typeof error === "object") {
    const e = error as { message?: string; meta?: { message?: string } };
    if (e.meta?.message) parts.push(e.meta.message);
    if (e.message) parts.push(e.message);
  } else {
    parts.push(String(error));
  }
  const haystack = parts.join(" | ");

  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (haystack.includes(code)) throw new BusinessError(message);
  }

  logger.error("Error de base no mapeado en reserva/cancelación", {
    error: haystack,
  });
  throw new BusinessError(
    "No se pudo completar la operación. Intentá nuevamente.",
  );
}

export const bookingService = {
  /**
   * Reserva un cupo de la franja. La capacidad y el bloqueo se validan de
   * forma atómica dentro de `book_slot`; acá solo agregamos un pre-chequeo
   * amable de existencia y de que la franja sea futura.
   *
   * Para el PRIMER turno de REHAB del paciente se valida la ventana de
   * días/horarios (ver más abajo). Si el paciente es `esPrimeraVez` (primera
   * reserva de cualquier servicio) se marca el tratamiento de 1 mes; esa lógica
   * es independiente de la ventana de REHAB.
   */
  async book(params: {
    slotId: string;
    userId: string;
    serviceId: string;
    notes?: string | null;
    esPrimeraVez?: boolean;
  }): Promise<BookResult> {
    const { slotId, userId, serviceId, notes, esPrimeraVez } = params;

    // Pre-chequeo + datos de la franja (para el evento posterior).
    const check = await prisma.$queryRaw<
      {
        is_future: boolean;
        date: string;
        start_time: string;
        end_time: string;
        day_of_week: number;
        start_hour: number;
        service_id: string | null;
        service_slug: string | null;
      }[]
    >`
      SELECT ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) > now() AS is_future,
             s.date::text AS date,
             to_char(s.start_time, 'HH24:MI') AS start_time,
             to_char(s.end_time, 'HH24:MI') AS end_time,
             extract(dow FROM s.date)::int AS day_of_week,
             extract(hour FROM s.start_time)::int AS start_hour,
             s.service_id::text AS service_id,
             sv.slug AS service_slug
      FROM slots s
      LEFT JOIN services sv ON sv.id = s.service_id
      WHERE s.id = ${slotId}::uuid
    `;
    if (check.length === 0) {
      throw new BusinessError(ERROR_MESSAGES.SLOT_NOT_FOUND);
    }
    const slot = check[0]!;
    if (!slot.is_future) {
      throw new BusinessError("Esa franja ya pasó. Elegí un horario futuro.");
    }

    // ── Regla acotada: PRIMER turno de REHAB ──────────────────────────────
    // Solo aplica al servicio REHAB y solo si el paciente no tiene NINGUNA
    // reserva de REHAB en estado CONFIRMED en su historia (las canceladas no
    // cuentan; por eso filtramos por status). Validamos contra el servicio REAL
    // de la franja —no un parámetro que el cliente podría falsear—: el servidor
    // es la verdad y la UI solo oculta lo que igualmente se rechazaría acá.
    //
    // Concurrencia: "es primer REHAB" es el estado RESTRICTIVO. Dos primeros
    // turnos casi simultáneos leen ambos 0 reservas → ambos quedan limitados a
    // la ventana, así que ninguno fuera de ventana puede colarse. Para saltear
    // la restricción haría falta una reserva CONFIRMED previa ya commiteada, lo
    // que no puede ocurrir con operaciones aún no confirmadas.
    if (slot.service_slug === REHAB_SLUG && slot.service_id) {
      const prior = await prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n
        FROM bookings
        WHERE user_id = ${userId}::text
          AND service_id = ${slot.service_id}::uuid
          AND status = 'CONFIRMED'
      `;
      const esPrimerRehab = (prior[0]?.n ?? 0) === 0;
      if (
        esPrimerRehab &&
        !isRehabFirstTimeSlotAllowed(slot.day_of_week, slot.start_hour)
      ) {
        throw new BusinessError(REHAB_FIRST_TIME_MESSAGE);
      }
    }

    try {
      // book_slot copia service_id del slot automáticamente (ver función SQL).
      const rows = await prisma.$queryRaw<{ booking_id: string | null }[]>`
        SELECT b.id AS booking_id
        FROM book_slot(${slotId}::uuid, ${userId}::text, ${notes ?? null}::text) AS b
      `;

      // ── Marcar primera vez completada y asignar tratamiento ────────────
      if (esPrimeraVez) {
        await prisma.$executeRaw`
          UPDATE "User"
          SET es_primera_vez = false,
              tratamiento_inicio = now(),
              tratamiento_fin = now() + interval '1 month',
              numero_sesion_actual = 1
          WHERE id = ${userId}
        `;
      } else {
        // Incrementar número de sesión
        await prisma.$executeRaw`
          UPDATE "User"
          SET numero_sesion_actual = numero_sesion_actual + 1
          WHERE id = ${userId} AND role = 'PATIENT'
        `;
      }

      logger.info("Reserva creada", { slotId, userId, serviceId });
      return {
        bookingId: rows[0]?.booking_id ?? null,
        date: slot.date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        isFirstTime: esPrimeraVez ?? false,
      };
    } catch (error) {
      rethrowAsBusiness(error);
    }
  },

  /**
   * Cancela una reserva propia. Para pacientes se aplica la ventana mínima de
   * antelación (`CANCELLATION_MIN_HOURS`); la liberación del cupo la hace
   * `cancel_booking` de forma atómica.
   */
  async cancel(params: {
    bookingId: string;
    userId: string;
    role: Role;
  }): Promise<void> {
    const { bookingId, userId, role } = params;

    const rows = await prisma.$queryRaw<{ starts_at: Date }[]>`
      SELECT ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) AS starts_at
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      WHERE b.id = ${bookingId}::uuid
        AND b.status <> 'CANCELLED'
        AND b.user_id = ${userId}::text
    `;
    if (rows.length === 0) {
      throw new BusinessError(ERROR_MESSAGES.BOOKING_NOT_FOUND);
    }

    if (role === ROLES.PATIENT) {
      const limit = Date.now() + CANCELLATION_MIN_HOURS * 3_600_000;
      if (rows[0]!.starts_at.getTime() < limit) {
        throw new BusinessError(
          `Solo podés cancelar con al menos ${CANCELLATION_MIN_HOURS}h de antelación. Escribinos a recepción.`,
        );
      }
    }

    try {
      // $executeRaw no intenta deserializar el resultado (cancel_booking
      // devuelve la fila bookings / void).
      await prisma.$executeRaw`
        SELECT cancel_booking(${bookingId}::uuid, ${userId}::text)
      `;
      logger.info("Reserva cancelada", { bookingId, userId, role });
    } catch (error) {
      rethrowAsBusiness(error);
    }
  },

  /**
   * Cancela como ADMIN: resuelve el dueño de la reserva y llama a la función
   * con ese user_id (la función valida pertenencia). Sin ventana de antelación.
   */
  async adminCancel(bookingId: string): Promise<void> {
    const rows = await prisma.$queryRaw<{ user_id: string }[]>`
      SELECT user_id FROM bookings
      WHERE id = ${bookingId}::uuid AND status <> 'CANCELLED'
    `;
    if (rows.length === 0) {
      throw new BusinessError(ERROR_MESSAGES.BOOKING_NOT_FOUND);
    }
    const ownerId = rows[0]!.user_id;
    try {
      await prisma.$executeRaw`
        SELECT cancel_booking(${bookingId}::uuid, ${ownerId}::text)
      `;
      logger.info("Reserva cancelada por admin", { bookingId });
    } catch (error) {
      rethrowAsBusiness(error);
    }
  },

  /** Reservas de un paciente (próximas e históricas), listo para mostrar. */
  async listForUser(userId: string): Promise<MyBooking[]> {
    const rows = await prisma.$queryRaw<
      {
        id: string;
        status: string;
        notes: string | null;
        date: string;
        start_time: string;
        end_time: string;
        starts_at: Date;
        service_name: string | null;
        service_color: string | null;
      }[]
    >`
      SELECT b.id, b.status, b.notes,
             s.date::text AS date,
             to_char(s.start_time, 'HH24:MI') AS start_time,
             to_char(s.end_time, 'HH24:MI') AS end_time,
             ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) AS starts_at,
             sv.name AS service_name,
             sv.color AS service_color
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      LEFT JOIN services sv ON sv.id = b.service_id
      WHERE b.user_id = ${userId}::text
      ORDER BY s.date DESC, s.start_time DESC
    `;
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      notes: r.notes,
      date: r.date,
      startTime: r.start_time,
      endTime: r.end_time,
      startsAtISO: r.starts_at.toISOString(),
      serviceName: r.service_name,
      serviceColor: r.service_color,
    }));
  },

  /**
   * ¿El paciente ya tiene al menos una reserva de REHAB en estado CONFIRMED?
   * Se usa para saber si la restricción de horarios del PRIMER turno de REHAB
   * aplica (no aplica si ya tuvo uno). Las canceladas no cuentan.
   */
  async hasConfirmedRehab(userId: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n
      FROM bookings
      WHERE user_id = ${userId}::text
        AND service_id = (SELECT id FROM services WHERE slug = ${REHAB_SLUG})
        AND status = 'CONFIRMED'
    `;
    return (rows[0]?.n ?? 0) > 0;
  },
};

export interface BookResult {
  bookingId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  isFirstTime: boolean;
}

export interface MyBooking {
  id: string;
  status: string;
  notes: string | null;
  date: string;
  startTime: string;
  endTime: string;
  startsAtISO: string;
  serviceName: string | null;
  serviceColor: string | null;
}
