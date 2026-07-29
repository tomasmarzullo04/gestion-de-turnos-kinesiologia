/**
 * Regla de negocio: restricción de horarios para el PRIMER turno de un paciente
 * en ciertos servicios (Opción B: la restricción se levanta cuando el paciente
 * YA ASISTIÓ —asistencia PRESENT— a una sesión de ESE servicio).
 *
 * La regla es CONFIGURABLE POR SERVICIO (indexada por `slug`, el identificador
 * estable —nunca por el nombre visible—). Cada servicio con regla define SUS
 * ventanas permitidas; los servicios sin entrada acá no tienen restricción.
 *
 * Única fuente de verdad: la UI y el servidor leen de este módulo. La validación
 * autoritativa vive en el servidor (dentro del flujo de `book_slot`); la UI solo
 * refleja.
 */

/**
 * Cortes horarios reutilizables. Ventana [startHour, endHour) sobre la hora de
 * inicio del bloque (24h).
 *  - mañana = 08:00–12:00
 *  - tarde  = 14:00–20:00
 *  - full   = 08:00–20:00 (día completo, incluye el mediodía)
 */
export const SHIFTS = {
  morning: { startHour: 8, endHour: 12 },
  afternoon: { startHour: 14, endHour: 20 },
  full: { startHour: 8, endHour: 20 },
} as const;

export type Shift = keyof typeof SHIFTS;

export interface FirstTimeRule {
  /** Slug del servicio (identificador estable). */
  slug: string;
  /**
   * Ventanas permitidas por día de la semana (0 = domingo … 6 = sábado, igual
   * que `Date.getDay()`). Cada día admite UNA O MÁS franjas (p. ej. GYM ofrece
   * miércoles mañana Y tarde, que no es "full" porque excluye el mediodía).
   */
  windows: Record<number, Shift[]>;
  /** Mensaje en español para UI y servidor. */
  message: string;
  /** Estado vacío coherente cuando no hay franjas dentro de las ventanas. */
  emptyMessage: string;
  /**
   * (Futuro, sin implementar) Granularidad especial del primer turno, p. ej.
   * turnos individuales de 40 min. Se deja el campo para no forzar el modelo.
   */
  firstTimeSlotMinutes?: number;
}

/**
 * Servicios con regla de primer turno y sus ventanas propias.
 * IMPORTANTE: la clave es el `slug` (estable), no el nombre visible.
 */
export const FIRST_TIME_RULES: Record<string, FirstTimeRule> = {
  // Kinesiología (slug interno "rehab"): Lun tarde · Mié completo · Vie mañana.
  rehab: {
    slug: "rehab",
    windows: { 1: ["afternoon"], 3: ["full"], 5: ["morning"] },
    message:
      "Tu primer turno de kinesiología debe ser lunes a la tarde, miércoles, o viernes a la mañana.",
    emptyMessage:
      "No hay turnos disponibles para tu primer turno de kinesiología en los próximos días.",
  },
  // GYM: Lun tarde · Mié mañana Y tarde (sin mediodía) · Vie mañana.
  gym: {
    slug: "gym",
    windows: { 1: ["afternoon"], 3: ["morning", "afternoon"], 5: ["morning"] },
    message:
      "Tu primer turno de gimnasio debe ser lunes a la tarde, miércoles (mañana o tarde), o viernes a la mañana.",
    emptyMessage:
      "No hay turnos disponibles para tu primer turno de gimnasio en los próximos días.",
  },
};

/** Slugs con regla de primer turno (para consultas y validaciones). */
export const FIRST_TIME_RULE_SLUGS = Object.keys(FIRST_TIME_RULES);

/** Devuelve la regla del servicio (por slug), o `null` si no tiene. */
export function getFirstTimeRule(slug: string | null | undefined): FirstTimeRule | null {
  if (!slug) return null;
  return FIRST_TIME_RULES[slug] ?? null;
}

/** ¿El día de la semana admite el primer turno para esa regla? */
export function isFirstTimeDayAllowed(rule: FirstTimeRule, dayOfWeek: number): boolean {
  const shifts = rule.windows[dayOfWeek];
  return Array.isArray(shifts) && shifts.length > 0;
}

/**
 * ¿La franja (día + hora de inicio) cae dentro de ALGUNA ventana permitida?
 * `hour` es la hora de inicio en 24h (0–23).
 */
export function isFirstTimeSlotAllowed(
  rule: FirstTimeRule,
  dayOfWeek: number,
  hour: number,
): boolean {
  const shifts = rule.windows[dayOfWeek];
  if (!shifts) return false;
  return shifts.some((s) => {
    const { startHour, endHour } = SHIFTS[s];
    return hour >= startHour && hour < endHour;
  });
}
