import type {
  AppointmentStatus,
  Role,
} from "@/lib/constants";

/**
 * Resultado tipado para Server Actions. Permite a la UI distinguir éxito de
 * error sin lanzar excepciones a través del límite cliente/servidor.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/** Slot de tiempo disponible para reservar (ISO strings, serializable). */
export interface TimeSlot {
  /** Inicio del slot (UTC, ISO). */
  startsAt: string;
  /** Fin del slot (UTC, ISO). */
  endsAt: string;
  /** Etiqueta de hora local "HH:mm" para mostrar. */
  label: string;
}

/** Métricas del dashboard de admin. */
export interface DashboardMetrics {
  todayCount: number;
  pendingCount: number;
  upcomingCount: number;
  completedThisWeek: number;
}

export type { AppointmentStatus, Role };
