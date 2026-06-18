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
