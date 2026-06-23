import {
  CANCELLATION_MIN_HOURS,
  ROLES,
  TIMEZONE,
  isFirstTimeSlotAllowed,
  type Role,
} from "@/lib/constants";
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
   * Si el paciente es `esPrimeraVez`, se aplica la regla de restricción de
   * días/horarios y se marca el tratamiento de 1 mes.
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
      }[]
    >`
      SELECT ((date + start_time) AT TIME ZONE ${TIMEZONE}) > now() AS is_future,
             date::text AS date,
             to_char(start_time, 'HH24:MI') AS start_time,
             to_char(end_time, 'HH24:MI') AS end_time,
             extract(dow FROM date)::int AS day_of_week,
             extract(hour FROM start_time)::int AS start_hour
      FROM slots
      WHERE id = ${slotId}::uuid
    `;
    if (check.length === 0) {
      throw new BusinessError(ERROR_MESSAGES.SLOT_NOT_FOUND);
    }
    const slot = check[0]!;
    if (!slot.is_future) {
      throw new BusinessError("Esa franja ya pasó. Elegí un horario futuro.");
    }

    // ── Regla de primera vez ──────────────────────────────────────────────
    if (esPrimeraVez) {
      const allowed = isFirstTimeSlotAllowed(slot.day_of_week, slot.start_hour);
      if (!allowed) {
        throw new BusinessError(
          "Tu primera consulta solo puede ser: Lunes (tarde), Miércoles (todo el día) o Viernes (mañana).",
        );
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
