import { BOOKING_CONFIG } from "@/lib/booking-config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const generationService = {
  /**
   * Materializa franjas concretas (`slots`) para los próximos N días a partir de
   * las plantillas activas, dividiendo cada ventana en bloques de
   * `BOOKING_CONFIG.blockMinutes`.
   *
   * Se resuelve con UNA sola sentencia `INSERT ... SELECT` basada en conjuntos
   * (`generate_series`), en lugar de cientos de `INSERT` individuales. Esto es
   * clave para la performance: contra el pooler de Supabase, cada round-trip
   * cuesta latencia, así que colapsar todo en una query hace que guardar/borrar
   * plantillas sea inmediato.
   *
   * Es idempotente (no duplica franjas ya existentes, incluido el caso de
   * `professional_id`/`service_id` NULL mediante `IS NOT DISTINCT FROM`) y
   * propaga `service_id` y `capacity` desde la plantilla al slot generado.
   *
   * @returns cantidad de franjas creadas.
   */
  async generateAgenda(days = BOOKING_CONFIG.generationDays): Promise<number> {
    const block = BOOKING_CONFIG.blockMinutes;

    const created = await prisma.$executeRaw`
      INSERT INTO slots (professional_id, service_id, date, start_time, end_time, capacity)
      SELECT t.professional_id,
             t.service_id,
             d::date,
             gs::time,
             (gs + (${block} || ' minutes')::interval)::time,
             t.capacity
      FROM slot_templates t
      CROSS JOIN generate_series(
        current_date,
        current_date + ((${days - 1}) || ' days')::interval,
        interval '1 day'
      ) AS d
      CROSS JOIN LATERAL generate_series(
        (d::date + t.start_time),
        (d::date + t.end_time) - (${block} || ' minutes')::interval,
        (${block} || ' minutes')::interval
      ) AS gs
      WHERE t.active
        AND extract(dow FROM d) = t.day_of_week
        AND NOT EXISTS (
          SELECT 1 FROM slots s
          WHERE s.date = d::date
            AND s.start_time = gs::time
            AND s.professional_id IS NOT DISTINCT FROM t.professional_id
            AND s.service_id IS NOT DISTINCT FROM t.service_id
        )
    `;

    logger.info("Agenda generada", { days, created: Number(created) });
    return Number(created);
  },

  /**
   * Sincroniza las franjas futuras con las plantillas activas. Es la operación
   * que corre automáticamente tras cualquier cambio de plantilla:
   *  1) crea las franjas faltantes,
   *  2) ajusta la capacidad de franjas futuras SIN reservas al valor EXACTO de
   *     la plantilla (la plantilla es la única fuente de verdad del cupo),
   *  3) elimina franjas futuras SIN reservas que ya no tienen plantilla activa,
   *  4) NUNCA toca franjas con reservas; las que quedan huérfanas o con
   *     capacidad por debajo de lo reservado se devuelven como CONFLICTOS.
   *
   * Las cuatro operaciones son sentencias basadas en conjuntos (una query cada
   * una), de modo que el guardado/borrado de plantillas es rápido y la
   * disponibilidad del socio refleja los cambios al instante.
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
