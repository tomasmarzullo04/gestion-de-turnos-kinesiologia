import { prisma } from "@/lib/db";

/**
 * Interfaz de regla de disponibilidad para un servicio.
 * Almacenada como JSONB en la columna `schedule` de la tabla `services`.
 */
export interface ScheduleRule {
  days: number[];   // 0 = Dom, 1 = Lun ... 6 = Sáb
  start: string;    // "HH:mm"
  end: string;      // "HH:mm"
}

export interface ServiceView {
  id: string;
  name: string;
  slug: string;
  color: string;
  capacity: number;
  schedule: ScheduleRule[];
  active: boolean;
}

/** Servicio de gestión del catálogo de servicios. */
export const serviceService = {
  /** Todos los servicios activos. */
  async listActive(): Promise<ServiceView[]> {
    const rows = await prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return rows.map(toView);
  },

  /** Todos los servicios (incluye inactivos, para admin). */
  async listAll(): Promise<ServiceView[]> {
    const rows = await prisma.service.findMany({ orderBy: { name: "asc" } });
    return rows.map(toView);
  },

  /** Buscar un servicio por slug. */
  async findBySlug(slug: string): Promise<ServiceView | null> {
    const row = await prisma.service.findUnique({ where: { slug } });
    return row ? toView(row) : null;
  },

  /** Buscar un servicio por id. */
  async findById(id: string): Promise<ServiceView | null> {
    const row = await prisma.service.findUnique({ where: { id } });
    return row ? toView(row) : null;
  },

  /**
   * Verifica si un día de la semana (0–6) y un horario ("HH:mm") están
   * dentro de las reglas de disponibilidad del servicio.
   */
  isTimeAvailable(schedule: ScheduleRule[], dayOfWeek: number, time: string): boolean {
    const timeMin = timeToMinutes(time);
    return schedule.some(
      (rule) =>
        rule.days.includes(dayOfWeek) &&
        timeMin >= timeToMinutes(rule.start) &&
        timeMin < timeToMinutes(rule.end),
    );
  },

  /**
   * Verifica si un día de la semana tiene al menos una franja disponible
   * según las reglas del servicio.
   */
  isDayAvailable(schedule: ScheduleRule[], dayOfWeek: number): boolean {
    return schedule.some((rule) => rule.days.includes(dayOfWeek));
  },

  /**
   * Devuelve las reglas de disponibilidad que aplican a un día de la semana.
   */
  getRulesForDay(schedule: ScheduleRule[], dayOfWeek: number): ScheduleRule[] {
    return schedule.filter((rule) => rule.days.includes(dayOfWeek));
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function toView(row: {
  id: string;
  name: string;
  slug: string;
  color: string;
  capacity: number;
  schedule: unknown;
  active: boolean;
}): ServiceView {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    capacity: row.capacity,
    schedule: (row.schedule as ScheduleRule[]) ?? [],
    active: row.active,
  };
}
