import {
  CANCELLATION_MIN_HOURS,
  ROLES,
  TIMEZONE,
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
   */
  async book(params: {
    slotId: string;
    userId: string;
    notes?: string | null;
  }): Promise<{ bookingId: string | null }> {
    const { slotId, userId, notes } = params;

    const check = await prisma.$queryRaw<{ is_future: boolean }[]>`
      SELECT ((date + start_time) AT TIME ZONE ${TIMEZONE}) > now() AS is_future
      FROM slots
      WHERE id = ${slotId}::uuid
    `;
    if (check.length === 0) {
      throw new BusinessError(ERROR_MESSAGES.SLOT_NOT_FOUND);
    }
    if (!check[0]!.is_future) {
      throw new BusinessError("Esa franja ya pasó. Elegí un horario futuro.");
    }

    try {
      const rows = await prisma.$queryRaw<{ book_slot: string | null }[]>`
        SELECT book_slot(${slotId}::uuid, ${userId}::text, ${notes ?? null}::text) AS book_slot
      `;
      logger.info("Reserva creada", { slotId, userId });
      return { bookingId: rows[0]?.book_slot ?? null };
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
          `Solo podés cancelar con al menos ${CANCELLATION_MIN_HOURS}h de antelación. Contactá a la consultoría.`,
        );
      }
    }

    try {
      await prisma.$queryRaw`
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
      await prisma.$queryRaw`
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
      }[]
    >`
      SELECT b.id, b.status, b.notes,
             s.date::text AS date,
             to_char(s.start_time, 'HH24:MI') AS start_time,
             to_char(s.end_time, 'HH24:MI') AS end_time,
             ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) AS starts_at
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
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
    }));
  },
};

export interface MyBooking {
  id: string;
  status: string;
  notes: string | null;
  date: string;
  startTime: string;
  endTime: string;
  startsAtISO: string;
}
