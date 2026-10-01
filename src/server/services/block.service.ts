import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { TIMEZONE } from "@/lib/constants";
import { logger } from "@/lib/logger";
import type { CreateBlockInput } from "@/lib/validations/block";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface BlockView {
  id: string;
  serviceId: string | null;
  serviceName: string | null;
  serviceColor: string | null;
  blockType: "TOTAL" | "FIRST_TIME";
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string;   // "YYYY-MM-DD"
  timeFrom: string | null; // "HH:mm"
  timeTo: string | null;   // "HH:mm"
  reason: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string; // ISO
}

/** Turno YA reservado (futuro) que cae dentro de un bloqueo que se va a crear. */
export interface AffectedBooking {
  patientName: string;
  serviceName: string | null;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
}

// ── Servicio ───────────────────────────────────────────────────────────────────
export const blockService = {
  /**
   * Bloqueos activos (no eliminados) cuya fecha de fin >= hoy en TZ Argentina.
   * Ordena por fecha de inicio ascendente.
   */
  async listActive(): Promise<BlockView[]> {
    const rows = await prisma.$queryRaw<
      {
        id: string;
        service_id: string | null;
        service_name: string | null;
        service_color: string | null;
        block_type: string;
        date_from: string;
        date_to: string;
        time_from: string | null;
        time_to: string | null;
        reason: string | null;
        created_by: string;
        created_by_name: string | null;
        created_at: Date;
      }[]
    >`
      SELECT b.id,
             b.service_id::text AS service_id,
             sv.name AS service_name,
             sv.color AS service_color,
             b.block_type,
             b.date_from::text AS date_from,
             b.date_to::text AS date_to,
             CASE WHEN b.time_from IS NOT NULL THEN to_char(b.time_from, 'HH24:MI') END AS time_from,
             CASE WHEN b.time_to IS NOT NULL THEN to_char(b.time_to, 'HH24:MI') END AS time_to,
             b.reason,
             b.created_by,
             u.name AS created_by_name,
             b.created_at
      FROM blocks b
      LEFT JOIN services sv ON sv.id = b.service_id
      LEFT JOIN "User" u ON u.id = b.created_by
      WHERE b.deleted_at IS NULL
        AND b.date_to >= (now() AT TIME ZONE ${TIMEZONE})::date
      ORDER BY b.date_from ASC, b.created_at ASC
    `;

    return rows.map((r) => ({
      id: r.id,
      serviceId: r.service_id,
      serviceName: r.service_name,
      serviceColor: r.service_color,
      blockType: r.block_type as "TOTAL" | "FIRST_TIME",
      dateFrom: r.date_from,
      dateTo: r.date_to,
      timeFrom: r.time_from,
      timeTo: r.time_to,
      reason: r.reason,
      createdBy: r.created_by,
      createdByName: r.created_by_name,
      createdAt: r.created_at.toISOString(),
    }));
  },

  /** Crea un bloqueo. */
  async create(
    data: CreateBlockInput,
    createdBy: string,
  ): Promise<{ id: string }> {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO blocks (service_id, block_type, date_from, date_to, time_from, time_to, reason, created_by)
      VALUES (
        ${data.serviceId ? data.serviceId : null}::uuid,
        ${data.blockType}::text,
        ${data.dateFrom}::date,
        ${data.dateTo}::date,
        ${data.timeFrom ?? null}::time,
        ${data.timeTo ?? null}::time,
        ${data.reason ?? null}::text,
        ${createdBy}::text
      )
      RETURNING id
    `;

    logger.info("Bloqueo creado", {
      id: rows[0]?.id,
      serviceId: data.serviceId,
      blockType: data.blockType,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      createdBy,
    });

    return { id: rows[0]!.id };
  },

  /** Soft-delete de un bloqueo (auditable). */
  async remove(blockId: string, deletedBy: string): Promise<void> {
    const updated = await prisma.$executeRaw`
      UPDATE blocks
      SET deleted_at = now(), deleted_by = ${deletedBy}::text
      WHERE id = ${blockId}::uuid AND deleted_at IS NULL
    `;
    if (updated === 0) {
      throw new Error("Bloqueo no encontrado o ya fue eliminado");
    }
    logger.info("Bloqueo eliminado", { blockId, deletedBy });
  },

  /**
   * Turnos FUTUROS ya reservados (CONFIRMED) que caen DENTRO del alcance de un
   * bloqueo que se está por crear. Sirve para avisar al profesional: el bloqueo
   * NO cancela reservas previas (es hacia adelante), así que si ya hay turnos
   * adentro, él decide si los cancela a mano.
   *
   * - TOTAL: cuenta TODOS los turnos del rango (todos quedarían "dentro").
   * - FIRST_TIME: solo los de PRIMERIZOS (sin asistencia PRESENT en ese
   *   servicio), que son los únicos a los que ese bloqueo afecta.
   */
  async affectedBookings(data: CreateBlockInput): Promise<AffectedBooking[]> {
    const serviceId = data.serviceId ?? null;
    const timeFrom = data.timeFrom && data.timeFrom !== "" ? data.timeFrom : null;
    const timeTo = data.timeTo && data.timeTo !== "" ? data.timeTo : null;

    // FIRST_TIME solo afecta a primerizos (sin PRESENT en ese servicio).
    const firstTimeFilter =
      data.blockType === "FIRST_TIME"
        ? Prisma.sql`
          AND NOT EXISTS (
            SELECT 1 FROM bookings b2
            JOIN attendances a ON a.booking_id = b2.id
            WHERE b2.user_id = b.user_id
              AND b2.service_id = s.service_id
              AND a.status = 'PRESENT'
          )`
        : Prisma.empty;

    const rows = await prisma.$queryRaw<
      { patient_name: string | null; service_name: string | null; date: string; start_time: string }[]
    >`
      SELECT u.name AS patient_name,
             sv.name AS service_name,
             s.date::text AS date,
             to_char(s.start_time, 'HH24:MI') AS start_time
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      LEFT JOIN services sv ON sv.id = s.service_id
      LEFT JOIN "User" u ON u.id = b.user_id
      WHERE b.status = 'CONFIRMED'
        AND s.date BETWEEN ${data.dateFrom}::date AND ${data.dateTo}::date
        AND (${serviceId}::uuid IS NULL OR s.service_id = ${serviceId}::uuid)
        AND (${timeFrom}::time IS NULL OR s.start_time >= ${timeFrom}::time)
        AND (${timeTo}::time IS NULL OR s.start_time < ${timeTo}::time)
        AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) > now()
        ${firstTimeFilter}
      ORDER BY s.date, s.start_time
    `;

    return rows.map((r) => ({
      patientName: r.patient_name ?? "Paciente",
      serviceName: r.service_name,
      date: r.date,
      startTime: r.start_time,
    }));
  },

  /**
   * ¿Hay un bloqueo activo que aplica a esta franja concreta?
   * Devuelve { totalBlocked, firstTimeBlocked }.
   *
   * Se usa en la validación de servidor al reservar.
   */
  async checkSlot(
    date: string,
    startTime: string,
    serviceId: string | null,
  ): Promise<{ totalBlocked: boolean; firstTimeBlocked: boolean }> {
    const rows = await prisma.$queryRaw<
      { block_type: string }[]
    >`
      SELECT DISTINCT b.block_type
      FROM blocks b
      WHERE b.deleted_at IS NULL
        AND ${date}::date BETWEEN b.date_from AND b.date_to
        AND (b.service_id IS NULL OR b.service_id = ${serviceId}::uuid)
        AND (b.time_from IS NULL OR ${startTime}::time >= b.time_from)
        AND (b.time_to IS NULL OR ${startTime}::time < b.time_to)
    `;

    const types = new Set(rows.map((r) => r.block_type));
    return {
      totalBlocked: types.has("TOTAL"),
      firstTimeBlocked: types.has("FIRST_TIME"),
    };
  },
};
