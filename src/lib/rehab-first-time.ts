/**
 * Regla de negocio acotada: restricción de horarios para el PRIMER turno de
 * REHAB (rehabilitación) de un paciente.
 *
 * Aplica SOLO al servicio REHAB y SOLO cuando es el primer turno de REHAB del
 * paciente en toda su historia (sin ninguna reserva de REHAB en estado
 * CONFIRMED). Del segundo turno en adelante —o para cualquier otro servicio—
 * no hay restricción alguna.
 *
 * Toda la parametrización (cortes horarios y ventanas permitidas) vive acá:
 * es la única fuente de verdad. La UI y el servidor leen de este módulo; no se
 * hardcodea nada en los componentes.
 */

/** Slug del servicio de rehabilitación (identificador estable). */
export const REHAB_SLUG = "rehab";

/**
 * Cortes horarios reutilizables. `startHour`/`endHour` en formato 24h; la
 * ventana es [startHour, endHour) sobre la hora de inicio del bloque.
 *  - mañana = 08:00–12:00
 *  - tarde  = 14:00–20:00
 *  - full   = 08:00–20:00 (día completo)
 */
export const REHAB_SHIFTS = {
  morning: { startHour: 8, endHour: 12 },
  afternoon: { startHour: 14, endHour: 20 },
  full: { startHour: 8, endHour: 20 },
} as const;

export type RehabShift = keyof typeof REHAB_SHIFTS;

/**
 * Ventanas permitidas para el primer turno de REHAB, por día de la semana
 * (0 = domingo … 6 = sábado, igual que `Date.getDay()`).
 *  - Lunes (1):     tarde   (14:00–20:00)
 *  - Miércoles (3): completo (08:00–20:00)
 *  - Viernes (5):   mañana  (08:00–12:00)
 * El resto de los días no admite el primer turno de REHAB.
 */
export const REHAB_FIRST_TIME_WINDOWS: Record<number, RehabShift> = {
  1: "afternoon",
  3: "full",
  5: "morning",
};

/** Mensaje único, en español, para UI y servidor. */
export const REHAB_FIRST_TIME_MESSAGE =
  "Tu primer turno de rehabilitación debe ser lunes a la tarde, miércoles, o viernes a la mañana.";

/** Estado vacío coherente cuando no hay franjas dentro de las ventanas. */
export const REHAB_FIRST_TIME_EMPTY =
  "No hay turnos disponibles para tu primer turno de rehabilitación en los próximos días.";

/** ¿El día de la semana admite el primer turno de REHAB? */
export function isRehabFirstTimeDayAllowed(dayOfWeek: number): boolean {
  return dayOfWeek in REHAB_FIRST_TIME_WINDOWS;
}

/**
 * ¿La franja (día + hora de inicio) está dentro de la ventana permitida para el
 * primer turno de REHAB? `hour` es la hora de inicio en formato 24h (0–23).
 */
export function isRehabFirstTimeSlotAllowed(
  dayOfWeek: number,
  hour: number,
): boolean {
  const shift = REHAB_FIRST_TIME_WINDOWS[dayOfWeek];
  if (!shift) return false;
  const { startHour, endHour } = REHAB_SHIFTS[shift];
  return hour >= startHour && hour < endHour;
}
