import { prisma } from "@/lib/db";
import { type SlotTemplateInput } from "@/lib/validations/slot-template";

/**
 * Plantillas de franjas (día + rango horario + capacidad + servicio). Se
 * acceden por SQL crudo porque las columnas son de tipo `time`, que con Prisma
 * se manejan como Date; con `to_char`/`::time` el manejo es directo.
 */
export interface SlotTemplateView {
  id: string;
  professionalId: string | null;
  serviceId: string | null;
  serviceName: string | null;
  serviceColor: string | null;
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
        service_id: string | null;
        service_name: string | null;
        service_color: string | null;
        day_of_week: number;
        start_time: string;
        end_time: string;
        capacity: number;
        active: boolean;
      }[]
    >`
      SELECT st.id, st.professional_id, st.service_id,
             s.name AS service_name, s.color AS service_color,
             st.day_of_week,
             to_char(st.start_time, 'HH24:MI') AS start_time,
             to_char(st.end_time, 'HH24:MI') AS end_time,
             st.capacity, st.active
      FROM slot_templates st
      LEFT JOIN services s ON s.id = st.service_id
      ORDER BY st.day_of_week ASC, st.start_time ASC
    `;
    return rows.map((r) => ({
      id: r.id,
      professionalId: r.professional_id,
      serviceId: r.service_id,
      serviceName: r.service_name,
      serviceColor: r.service_color,
      dayOfWeek: r.day_of_week,
      startTime: r.start_time,
      endTime: r.end_time,
      capacity: r.capacity,
      active: r.active,
    }));
  },

  async create(input: SlotTemplateInput): Promise<void> {
    const pid = input.professionalId ?? null;
    const sid = input.serviceId ?? null;
    const queries: any[] = [];
    for (const day of input.daysOfWeek) {
      for (const range of input.ranges) {
        queries.push(
          prisma.$executeRaw`
            INSERT INTO slot_templates (professional_id, service_id, day_of_week, start_time, end_time, capacity, active)
            VALUES (${pid}::uuid, ${sid}::uuid, ${day}, ${range.startTime}::time, ${range.endTime}::time, ${range.capacity}, true)
          `
        );
      }
    }
    await Promise.all(queries);
  },

  async updateGroup(oldDayOfWeek: number, oldServiceId: string | null, input: SlotTemplateInput): Promise<void> {
    if (oldServiceId) {
      await prisma.$executeRaw`DELETE FROM slot_templates WHERE day_of_week = ${oldDayOfWeek} AND service_id = ${oldServiceId}::uuid`;
    } else {
      await prisma.$executeRaw`DELETE FROM slot_templates WHERE day_of_week = ${oldDayOfWeek} AND service_id IS NULL`;
    }
    await this.create(input);
  },

  async setActiveGroup(dayOfWeek: number, serviceId: string | null, active: boolean): Promise<void> {
    if (serviceId) {
      await prisma.$executeRaw`
        UPDATE slot_templates SET active = ${active} WHERE day_of_week = ${dayOfWeek} AND service_id = ${serviceId}::uuid
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE slot_templates SET active = ${active} WHERE day_of_week = ${dayOfWeek} AND service_id IS NULL
      `;
    }
  },

  async removeGroup(dayOfWeek: number, serviceId: string | null): Promise<void> {
    if (serviceId) {
      await prisma.$executeRaw`DELETE FROM slot_templates WHERE day_of_week = ${dayOfWeek} AND service_id = ${serviceId}::uuid`;
    } else {
      await prisma.$executeRaw`DELETE FROM slot_templates WHERE day_of_week = ${dayOfWeek} AND service_id IS NULL`;
    }
  },
};
