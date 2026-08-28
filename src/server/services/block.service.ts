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
