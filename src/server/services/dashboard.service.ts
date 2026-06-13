import { addMinutes, subDays } from "date-fns";

import {
  ACTIVE_STATUSES,
  APPOINTMENT_STATUS,
} from "@/lib/constants";
import {
  combineDateAndTime,
  parseLocalDateKey,
  toLocalDateKey,
} from "@/lib/datetime";
import { appointmentRepository } from "@/server/repositories/appointment.repository";
import { type DashboardMetrics } from "@/types";

export const dashboardService = {
  async getMetrics(professionalId?: string): Promise<DashboardMetrics> {
    const now = new Date();
    const today = parseLocalDateKey(toLocalDateKey(now));
    const dayStart = combineDateAndTime(today, "00:00");
    const dayEnd = addMinutes(dayStart, 24 * 60);
    const weekAgo = subDays(now, 7);

    const base = professionalId ? { professionalId } : {};

    const [todayCount, pendingCount, upcomingCount, completedThisWeek] =
      await Promise.all([
        appointmentRepository.count({
          ...base,
          status: { in: ACTIVE_STATUSES },
          startsAt: { gte: dayStart, lt: dayEnd },
        }),
        appointmentRepository.count({
          ...base,
          status: APPOINTMENT_STATUS.PENDING,
          startsAt: { gte: now },
        }),
        appointmentRepository.count({
          ...base,
          status: { in: ACTIVE_STATUSES },
          startsAt: { gte: now },
        }),
        appointmentRepository.count({
          ...base,
          status: APPOINTMENT_STATUS.COMPLETED,
          startsAt: { gte: weekAgo, lte: now },
        }),
      ]);

    return { todayCount, pendingCount, upcomingCount, completedThisWeek };
  },

  /** Turnos activos del día (para la agenda del dashboard). */
  async getTodayAgenda(professionalId?: string) {
    const now = new Date();
    const today = parseLocalDateKey(toLocalDateKey(now));
    const dayStart = combineDateAndTime(today, "00:00");
    const dayEnd = addMinutes(dayStart, 24 * 60);

    return appointmentRepository.list(
      {
        ...(professionalId ? { professionalId } : {}),
        from: dayStart,
        to: dayEnd,
      },
      "asc",
    );
  },
};
