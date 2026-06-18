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
  day_of_week: number;
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
  capacity: number;
}

interface Candidate {
  professionalId: string | null;
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
   * @returns cantidad de franjas creadas.
   */
  async generateAgenda(days = BOOKING_CONFIG.generationDays): Promise<number> {
    const templates = await prisma.$queryRaw<TemplateRow[]>`
      SELECT professional_id, day_of_week,
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
          INSERT INTO slots (professional_id, date, start_time, end_time, capacity)
          SELECT ${c.professionalId}::uuid, ${c.date}::date, ${c.start}::time, ${c.end}::time, ${c.capacity}
          WHERE NOT EXISTS (
            SELECT 1 FROM slots
            WHERE date = ${c.date}::date
              AND start_time = ${c.start}::time
              AND professional_id IS NOT DISTINCT FROM ${c.professionalId}::uuid
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
};
