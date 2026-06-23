/**
 * Constantes de dominio y configuración general (no específica de cupos; eso
 * vive en src/lib/booking-config.ts).
 */

// ── Roles ──────────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN: "ADMIN",
  PATIENT: "PATIENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export const ROLE_VALUES = Object.values(ROLES) as [Role, ...Role[]];

// ── Días de la semana (0 = domingo … 6 = sábado, compatible con date-fns) ────
export const DAYS_OF_WEEK = [
  { value: 0, short: "Dom", label: "Domingo" },
  { value: 1, short: "Lun", label: "Lunes" },
  { value: 2, short: "Mar", label: "Martes" },
  { value: 3, short: "Mié", label: "Miércoles" },
  { value: 4, short: "Jue", label: "Jueves" },
  { value: 5, short: "Vie", label: "Viernes" },
  { value: 6, short: "Sáb", label: "Sábado" },
] as const;

export function dayLabel(dayOfWeek: number): string {
  return DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label ?? "—";
}

// ── Tipos de cobertura ────────────────────────────────────────────────────
export const COVERAGE_TYPES = {
  OBRA_SOCIAL: "OBRA_SOCIAL",
  PARTICULAR: "PARTICULAR",
} as const;

export type CoverageType = (typeof COVERAGE_TYPES)[keyof typeof COVERAGE_TYPES];

export const COVERAGE_TYPE_LABELS: Record<CoverageType, string> = {
  OBRA_SOCIAL: "Obra Social",
  PARTICULAR: "Particular",
};

// ── Regla de "primera vez" ────────────────────────────────────────────────
// Corte mañana/tarde: 13:00
export const FIRST_TIME_CUTOFF_HOUR = 13;

/**
 * Reglas para primera vez: los días/turnos en los que un paciente nuevo
 * puede reservar. Se cruzan con las reglas del servicio seleccionado.
 *
 * - Lunes: solo turno tarde (>= 13:00)
 * - Miércoles: todo el día
 * - Viernes: solo turno mañana (< 13:00)
 */
export const FIRST_TIME_RULES = [
  { day: 1, shift: "afternoon" as const },  // Lunes tarde
  { day: 3, shift: "all" as const },         // Miércoles todo el día
  { day: 5, shift: "morning" as const },     // Viernes mañana
] as const;

/**
 * Verifica si un día de la semana + hora es válido para un paciente de
 * primera vez. `hour` es la hora de inicio en formato 24h (0–23).
 */
export function isFirstTimeSlotAllowed(dayOfWeek: number, hour: number): boolean {
  const rule = FIRST_TIME_RULES.find((r) => r.day === dayOfWeek);
  if (!rule) return false;
  if (rule.shift === "all") return true;
  if (rule.shift === "morning") return hour < FIRST_TIME_CUTOFF_HOUR;
  if (rule.shift === "afternoon") return hour >= FIRST_TIME_CUTOFF_HOUR;
  return false;
}

/**
 * Verifica si un día de la semana es válido para un paciente de primera vez
 * (independientemente del horario).
 */
export function isFirstTimeDayAllowed(dayOfWeek: number): boolean {
  return FIRST_TIME_RULES.some((r) => r.day === dayOfWeek);
}

// ── Configuración general (variables de entorno) ─────────────────────────────
function intEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const TIMEZONE =
  process.env.NEXT_PUBLIC_TIMEZONE ?? "America/Argentina/Buenos_Aires";

/** Antelación mínima (horas) para que un paciente cancele un turno. */
export const CANCELLATION_MIN_HOURS = intEnv(
  process.env.CANCELLATION_MIN_HOURS,
  24,
);
