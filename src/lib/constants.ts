/**
 * Constantes de dominio y configuración de negocio.
 *
 * Los "enums" se modelan como objetos `as const` (en lugar de enums de Prisma,
 * que SQLite no soporta) y se reutilizan tanto en cliente como en servidor.
 */

// ── Roles ──────────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN: "ADMIN",
  PATIENT: "PATIENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export const ROLE_VALUES = Object.values(ROLES) as [Role, ...Role[]];

// ── Estados de turno ─────────────────────────────────────────────────────────
export const APPOINTMENT_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;

export type AppointmentStatus =
  (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];
export const APPOINTMENT_STATUS_VALUES = Object.values(
  APPOINTMENT_STATUS,
) as [AppointmentStatus, ...AppointmentStatus[]];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Completado",
};

/** Estados que ocupan un slot (no se pueden solapar con otro turno). */
export const ACTIVE_STATUSES: AppointmentStatus[] = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.CONFIRMED,
];

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

// ── Configuración de negocio (derivada de variables de entorno) ──────────────
function intEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const TIMEZONE =
  process.env.NEXT_PUBLIC_TIMEZONE ?? "America/Argentina/Buenos_Aires";

/** Antelación mínima (horas) para cancelar un turno. */
export const CANCELLATION_MIN_HOURS = intEnv(
  process.env.CANCELLATION_MIN_HOURS,
  24,
);

/** Antelación mínima (horas) para reservar un turno. */
export const BOOKING_MIN_LEAD_HOURS = intEnv(
  process.env.BOOKING_MIN_LEAD_HOURS,
  2,
);

/** Granularidad (minutos) de los slots ofrecidos al reservar. */
export const SLOT_INTERVAL_MINUTES = intEnv(
  process.env.SLOT_INTERVAL_MINUTES,
  15,
);
