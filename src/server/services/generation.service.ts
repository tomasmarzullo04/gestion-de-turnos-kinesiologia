import { addDays, format } from "date-fns";

import { BOOKING_CONFIG } from "@/lib/booking-config";
import { TIMEZONE } from "@/lib/constants";
import {
  minutesToTime,
  parseLocalDateKey,
  timeToMinutes,
  toLocalDateKey,
} from "@/lib/datetime";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

interface TemplateRow {
  professional_id: string | null;
  service_id: string | null;
  day_of_week: number;
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
  capacity: number;
}

interface Candidate {
  professionalId: string | null;
  serviceId: string | null;
  date: string; // "YYYY-MM-DD"
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  capacity: number;
}

export const generationService = {
  /**
   * Materializa franjas concretas (`slots`) para los próximos N días a partir de
   * las plantillas activas, dividiendo cada ventana en bloques de
   * `BOOKING_CONFIG.blockMinutes`. No duplica franjas ya existentes (incluye el
   * caso de `professional_id` NULL mediante `IS NOT DISTINCT FROM`).
   *
   * Ahora propaga `service_id` desde la plantilla al slot generado.
   *
   * @returns cantidad de franjas creadas.
   */
  async generateAgenda(days = BOOKING_CONFIG.generationDays): Promise<number> {
    const templates = await prisma.$queryRaw<TemplateRow[]>`
      SELECT professional_id, service_id, day_of_week,
             to_char(start_time, 'HH24:MI') AS start_time,
             to_char(end_time, 'HH24:MI') AS end_time,
             capacity
      FROM slot_templates
      WHERE active = true
    `;
    if (templates.length === 0) return 0;

    const block = BOOKING_CONFIG.blockMinutes;
    const today = parseLocalDateKey(toLocalDateKey(new Date()));

    const candidates: Candidate[] = [];
    for (let i = 0; i < days; i++) {
      const day = addDays(today, i);
      const dateKey = format(day, "yyyy-MM-dd");
      const dow = day.getDay();

      for (const tpl of templates.filter((t) => t.day_of_week === dow)) {
        const startMin = timeToMinutes(tpl.start_time);
        const endMin = timeToMinutes(tpl.end_time);
        for (let m = startMin; m + block <= endMin; m += block) {
          candidates.push({
            professionalId: tpl.professional_id,
            serviceId: tpl.service_id,
            date: dateKey,
            start: minutesToTime(m),
            end: minutesToTime(m + block),
            capacity: tpl.capacity,
          });
        }
      }
    }

    if (candidates.length === 0) return 0;

    // Inserción idempotente: cada fila solo si no existe ya esa franja.
    const results = await prisma.$transaction(
      candidates.map(
        (c) => prisma.$executeRaw`
          INSERT INTO slots (professional_id, service_id, date, start_time, end_time, capacity)
          SELECT ${c.professionalId}::uuid, ${c.serviceId}::uuid, ${c.date}::date, ${c.start}::time, ${c.end}::time, ${c.capacity}
          WHERE NOT EXISTS (
            SELECT 1 FROM slots
            WHERE date = ${c.date}::date
              AND start_time = ${c.start}::time
              AND professional_id IS NOT DISTINCT FROM ${c.professionalId}::uuid
              AND service_id IS NOT DISTINCT FROM ${c.serviceId}::uuid
          )
        `,
      ),
    );

    const created = results.reduce((sum, n) => sum + Number(n), 0);
    logger.info("Agenda generada", {
      timezone: TIMEZONE,
      days,
      candidates: candidates.length,
      created,
    });
    return created;
  },

  /**
   * Sincroniza las franjas futuras con las plantillas activas. Es la operación
   * que corre automáticamente tras cualquier cambio de plantilla:
   *  1) crea las franjas faltantes,
   *  2) ajusta la capacidad de franjas futuras SIN reservas,
   *  3) elimina franjas futuras SIN reservas que ya no tienen plantilla activa,
   *  4) NUNCA toca franjas con reservas; las que quedan huérfanas o con
   *     capacidad por debajo de lo reservado se devuelven como CONFLICTOS.
   */
  async syncFutureSlots(days = BOOKING_CONFIG.generationDays): Promise<{
    created: number;
    updated: number;
    removed: number;
    conflicts: SyncConflict[];
  }> {
    const created = await this.generateAgenda(days);

    const updated = await prisma.$executeRaw`
      UPDATE slots s
      SET capacity = t.capacity
      FROM slot_templates t
      WHERE s.date >= current_date
        AND s.booked_count = 0
        AND t.active
        AND extract(dow FROM s.date) = t.day_of_week
        AND s.start_time >= t.start_time
        AND s.end_time <= t.end_time
        AND s.professional_id IS NOT DISTINCT FROM t.professional_id
        AND s.service_id IS NOT DISTINCT FROM t.service_id
        AND s.capacity <> t.capacity
    `;

    const removed = await prisma.$executeRaw`
      DELETE FROM slots s
      WHERE s.date >= current_date
        AND s.booked_count = 0
        AND NOT EXISTS (
          SELECT 1 FROM slot_templates t
          WHERE t.active
            AND extract(dow FROM s.date) = t.day_of_week
            AND s.start_time >= t.start_time
            AND s.end_time <= t.end_time
            AND s.professional_id IS NOT DISTINCT FROM t.professional_id
            AND s.service_id IS NOT DISTINCT FROM t.service_id
        )
    `;

    const conflictRows = await prisma.$queryRaw<
      {
        date: string;
        start_time: string;
        service_name: string | null;
        booked_count: number;
        reason: string;
      }[]
    >`
      WITH matched AS (
        SELECT s.id, s.booked_count, s.date, s.start_time, s.service_id,
               (SELECT max(t.capacity) FROM slot_templates t
                WHERE t.active
                  AND extract(dow FROM s.date) = t.day_of_week
                  AND s.start_time >= t.start_time
                  AND s.end_time <= t.end_time
                  AND s.professional_id IS NOT DISTINCT FROM t.professional_id
                  AND s.service_id IS NOT DISTINCT FROM t.service_id) AS tpl_capacity
        FROM slots s
        WHERE s.date >= current_date AND s.booked_count > 0
      )
      SELECT m.date::text AS date,
             to_char(m.start_time, 'HH24:MI') AS start_time,
             sv.name AS service_name,
             m.booked_count,
             CASE WHEN m.tpl_capacity IS NULL THEN 'removed' ELSE 'over_capacity' END AS reason
      FROM matched m
      LEFT JOIN services sv ON sv.id = m.service_id
      WHERE m.tpl_capacity IS NULL OR m.tpl_capacity < m.booked_count
      ORDER BY m.date, m.start_time
    `;

    logger.info("Sync de franjas", {
      created,
      updated: Number(updated),
      removed: Number(removed),
      conflicts: conflictRows.length,
    });

    return {
      created,
      updated: Number(updated),
      removed: Number(removed),
      conflicts: conflictRows.map((r) => ({
        date: r.date,
        startTime: r.start_time,
        serviceName: r.service_name,
        bookedCount: r.booked_count,
        reason: r.reason === "removed" ? "removed" : "over_capacity",
      })),
    };
  },
};

export interface SyncConflict {
  date: string;
  startTime: string;
  serviceName: string | null;
  bookedCount: number;
  reason: "removed" | "over_capacity";
}
