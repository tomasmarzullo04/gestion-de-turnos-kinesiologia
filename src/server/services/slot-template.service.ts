import { prisma } from "@/lib/db";
import { type SlotTemplateInput } from "@/lib/validations/slot-template";

/**
 * Plantillas de franjas (día + rango horario + capacidad). Se acceden por SQL
 * crudo porque las columnas son de tipo `time`, que con Prisma se manejan como
 * Date; con `to_char`/`::time` el manejo es directo y predecible.
 */
export interface SlotTemplateView {
  id: string;
  professionalId: string | null;
  dayOfWeek: number;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  capacity: number;
  active: boolean;
}

export const slotTemplateService = {
  async list(): Promise<SlotTemplateView[]> {
    const rows = await prisma.$queryRaw<
      {
        id: string;
        professional_id: string | null;
        day_of_week: number;
        start_time: string;
        end_time: string;
        capacity: number;
        active: boolean;
      }[]
    >`
      SELECT id, professional_id, day_of_week,
             to_char(start_time, 'HH24:MI') AS start_time,
             to_char(end_time, 'HH24:MI') AS end_time,
             capacity, active
      FROM slot_templates
      ORDER BY day_of_week ASC, start_time ASC
    `;
    return rows.map((r) => ({
      id: r.id,
      professionalId: r.professional_id,
      dayOfWeek: r.day_of_week,
      startTime: r.start_time,
      endTime: r.end_time,
      capacity: r.capacity,
      active: r.active,
    }));
  },

  async create(input: SlotTemplateInput): Promise<void> {
    const pid = input.professionalId ?? null;
    await prisma.$executeRaw`
      INSERT INTO slot_templates (professional_id, day_of_week, start_time, end_time, capacity, active)
      VALUES (${pid}::uuid, ${input.dayOfWeek}, ${input.startTime}::time, ${input.endTime}::time, ${input.capacity}, true)
    `;
  },

  async update(id: string, input: SlotTemplateInput): Promise<void> {
    const pid = input.professionalId ?? null;
    await prisma.$executeRaw`
      UPDATE slot_templates
      SET professional_id = ${pid}::uuid,
          day_of_week = ${input.dayOfWeek},
          start_time = ${input.startTime}::time,
          end_time = ${input.endTime}::time,
          capacity = ${input.capacity}
      WHERE id = ${id}::uuid
    `;
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await prisma.$executeRaw`
      UPDATE slot_templates SET active = ${active} WHERE id = ${id}::uuid
    `;
  },

  async remove(id: string): Promise<void> {
    await prisma.$executeRaw`DELETE FROM slot_templates WHERE id = ${id}::uuid`;
  },
};
