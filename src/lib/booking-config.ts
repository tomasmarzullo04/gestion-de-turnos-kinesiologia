/**
 * Configuración central del sistema de cupos (valores DEMO, fáciles de cambiar).
 * Todo lo que define el "tamaño" de la agenda vive acá; la lógica no hardcodea
 * estos números. Se pueden sobreescribir por variables de entorno.
 */
function intEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const BOOKING_CONFIG = {
  /** Capacidad por defecto al crear plantillas/franjas (cupo del gimnasio). */
  capacityDefault: intEnv(process.env.SLOT_CAPACITY_DEFAULT, 10),
  /** Inicio de la jornada (hora local del estudio), "HH:mm". */
  dayStart: process.env.DAY_START ?? "08:00",
  /** Fin de la jornada (hora local del estudio), "HH:mm". */
  dayEnd: process.env.DAY_END ?? "21:00",
  /** Duración de cada bloque, en minutos. */
  blockMinutes: intEnv(process.env.BLOCK_MINUTES, 60),
  /** Umbral para marcar "pocos cupos" (cuando restantes ≤ este valor). */
  lowSlotsThreshold: intEnv(process.env.LOW_SLOTS_THRESHOLD, 3),
  /** Días hacia adelante que materializa "Generar agenda". */
  generationDays: intEnv(process.env.GENERATION_DAYS, 30),
} as const;

// Estados de una reserva (los maneja la base; el default es CONFIRMED).
export const BOOKING_STATUS = {
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;

export type BookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
};
