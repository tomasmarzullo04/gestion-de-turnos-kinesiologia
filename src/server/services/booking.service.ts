import { randomUUID } from "node:crypto";

import { addDays, format } from "date-fns";

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
import { parseLocalDateKey, toLocalDateKey } from "@/lib/datetime";
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
    // Solo aplica al servicio REHAB. La restricción de ventana se mantiene
    // hasta que el paciente ASISTIÓ a una sesión de REHAB (asistencia PRESENT);
    // ver `puedeReservarRehabLibre`. Mientras no haya un PRESENT, TODA reserva
    // REHAB nueva debe caer en ventana, sin importar cuántas futuras ya tenga.
    // Validamos contra el servicio REAL de la franja (no un parámetro que el
    // cliente podría falsear): el servidor es la verdad; la UI solo refleja.
    //
    // Concurrencia: el estado "libre" solo se activa al marcar asistencia
    // PRESENT (acción del profesional), nunca desde el flujo de reserva. Por
    // eso dos reservas REHAB casi simultáneas leen ambas "no libre" → ambas
    // quedan limitadas a la ventana y ninguna fuera de ventana puede colarse.
    if (slot.service_slug === REHAB_SLUG && slot.service_id) {
      const libre = await this.puedeReservarRehabLibre(userId);
      if (
        !libre &&
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

    // Agrupación de series (turnos fijos). Resiliente: si la columna aún no
    // existe (migración pendiente), no hay series y la lista no se rompe.
    let recMap = new Map<string, string>();
    try {
      const rec = await prisma.$queryRaw<{ id: string; recurrence_id: string | null }[]>`
        SELECT id, recurrence_id::text AS recurrence_id
        FROM bookings
        WHERE user_id = ${userId}::text AND recurrence_id IS NOT NULL
      `;
      recMap = new Map(rec.filter((r) => r.recurrence_id).map((r) => [r.id, r.recurrence_id!]));
    } catch {
      recMap = new Map();
    }

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
      recurrenceId: recMap.get(r.id) ?? null,
    }));
  },

  /**
   * ¿El paciente puede reservar REHAB SIN restricción de horarios?
   *
   * Criterio (Opción B, confirmado por el negocio): la restricción del primer
   * turno se levanta SOLO cuando el paciente YA ASISTIÓ a una sesión de REHAB,
   * es decir, cuando existe una reserva REHAB suya con asistencia PRESENT.
   *
   * Tener reservas REHAB futuras NO alcanza: una reserva no cumplida no
   * significa que ya hizo su primera sesión. Hasta que haya un PRESENT, TODA
   * reserva REHAB nueva debe caer en ventana permitida.
   *
   * Es la ÚNICA fuente de verdad: la usan tanto la UI como el servidor.
   */
  async puedeReservarRehabLibre(userId: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<{ ok: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM bookings b
        JOIN attendances a ON a.booking_id = b.id
        WHERE b.user_id = ${userId}::text
          AND b.service_id = (SELECT id FROM services WHERE slug = ${REHAB_SLUG})
          AND a.status = 'PRESENT'
      ) AS ok
    `;
    return rows[0]?.ok ?? false;
  },

  /** Horarios de inicio disponibles (distintos) de un servicio a futuro. */
  async getServiceStartTimes(serviceId: string): Promise<string[]> {
    const rows = await prisma.$queryRaw<{ start_time: string }[]>`
      SELECT DISTINCT to_char(start_time, 'HH24:MI') AS start_time
      FROM slots
      WHERE service_id = ${serviceId}::uuid
        AND date >= current_date
        AND NOT is_blocked
      ORDER BY start_time
    `;
    return rows.map((r) => r.start_time);
  },

  /**
   * Turno fijo: genera una reserva por cada fecha del rango cuyo día de la
   * semana esté en `daysOfWeek`, al horario `startTime`, para el servicio dado.
   *
   * Cada fecha se reserva con `book_slot` (lock atómico) → no sobre-reserva. La
   * generación es secuencial (sin transacción gigante). Las fechas sin cupo o
   * sin franja NO abortan la operación: se reportan por separado. Respeta la
   * regla del primer turno de REHAB (cada fecha debe caer en ventana mientras el
   * paciente no esté libre).
   */
  async bookSeries(params: {
    userId: string;
    serviceId: string;
    daysOfWeek: number[];
    startTime: string;
    toDate: string;
    notes?: string | null;
  }): Promise<SeriesResult> {
    const { userId, serviceId, daysOfWeek, startTime, toDate, notes } = params;

    // Guardia: la columna recurrence_id debe existir (migración aplicada).
    try {
      await prisma.$queryRaw`SELECT recurrence_id FROM bookings LIMIT 1`;
    } catch {
      throw new BusinessError(
        "Los turnos fijos no están disponibles todavía. Probá más tarde.",
      );
    }

    const today = parseLocalDateKey(toLocalDateKey(new Date()));
    const end = parseLocalDateKey(toDate);
    if (end < today) {
      throw new BusinessError("La fecha final ya pasó. Elegí una fecha futura.");
    }
    // Horizonte máximo para no generar series gigantes.
    const maxEnd = addDays(today, 120);
    const lastDate = end > maxEnd ? maxEnd : end;

    // ¿Es REHAB? ¿El paciente está libre de la restricción de ventana?
    const svc = await prisma.$queryRaw<{ slug: string }[]>`
      SELECT slug FROM services WHERE id = ${serviceId}::uuid
    `;
    const isRehab = svc[0]?.slug === REHAB_SLUG;
    const rehabLibre = isRehab ? await this.puedeReservarRehabLibre(userId) : true;

    const recurrenceId = randomUUID();
    const days = new Set(daysOfWeek);
    const results: SeriesItemResult[] = [];

    for (let d = today; d <= lastDate; d = addDays(d, 1)) {
      if (!days.has(d.getDay())) continue;
      const dateKey = format(d, "yyyy-MM-dd");

      const slotRows = await prisma.$queryRaw<
        { id: string; end_time: string; dow: number; hour: number }[]
      >`
        SELECT s.id,
               to_char(s.end_time, 'HH24:MI') AS end_time,
               extract(dow FROM s.date)::int AS dow,
               extract(hour FROM s.start_time)::int AS hour
        FROM slots s
        WHERE s.service_id = ${serviceId}::uuid
          AND s.date = ${dateKey}::date
          AND s.start_time = ${startTime}::time
          AND NOT s.is_blocked
          AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) > now()
      `;
      const slot = slotRows[0];
      if (!slot) {
        results.push({ date: dateKey, startTime, endTime: null, status: "no_slot" });
        continue;
      }

      if (isRehab && !rehabLibre && !isRehabFirstTimeSlotAllowed(slot.dow, slot.hour)) {
        results.push({ date: dateKey, startTime, endTime: slot.end_time, status: "rehab_window" });
        continue;
      }

      try {
        const booked = await prisma.$queryRaw<{ booking_id: string | null }[]>`
          SELECT b.id AS booking_id
          FROM book_slot(${slot.id}::uuid, ${userId}::text, ${notes ?? null}::text) AS b
        `;
        const bookingId = booked[0]?.booking_id ?? null;
        if (bookingId) {
          await prisma.$executeRaw`
            UPDATE bookings SET recurrence_id = ${recurrenceId}::uuid WHERE id = ${bookingId}::uuid
          `;
        }
        results.push({ date: dateKey, startTime, endTime: slot.end_time, status: "booked" });
      } catch (error) {
        const msg = String((error as { message?: string })?.message ?? error);
        const status: SeriesItemStatus = msg.includes("SLOT_FULL")
          ? "full"
          : msg.includes("ALREADY_BOOKED")
            ? "already"
            : "error";
        results.push({ date: dateKey, startTime, endTime: slot.end_time, status });
      }
    }

    const booked = results.filter((r) => r.status === "booked").length;
    logger.info("Serie creada", { userId, serviceId, recurrenceId, booked, total: results.length });
    return { recurrenceId, results, booked, total: results.length };
  },

  /** Cancela todas las reservas FUTURAS de una serie (las pasadas no se tocan). */
  async cancelSeries(params: { recurrenceId: string; userId: string }): Promise<number> {
    const { recurrenceId, userId } = params;
    const future = await prisma.$queryRaw<{ id: string }[]>`
      SELECT b.id
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      WHERE b.recurrence_id = ${recurrenceId}::uuid
        AND b.user_id = ${userId}::text
        AND b.status <> 'CANCELLED'
        AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) >= now()
    `;
    for (const row of future) {
      await prisma.$executeRaw`
        SELECT cancel_booking(${row.id}::uuid, ${userId}::text)
      `;
    }
    logger.info("Serie cancelada", { recurrenceId, userId, cancelled: future.length });
    return future.length;
  },
};

export type SeriesItemStatus =
  | "booked"
  | "no_slot"
  | "full"
  | "already"
  | "rehab_window"
  | "error";

export interface SeriesItemResult {
  date: string;
  startTime: string;
  endTime: string | null;
  status: SeriesItemStatus;
}

export interface SeriesResult {
  recurrenceId: string;
  results: SeriesItemResult[];
  booked: number;
  total: number;
}

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
  recurrenceId: string | null;
}
