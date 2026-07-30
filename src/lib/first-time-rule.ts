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
  // Kinesiología (slug interno "rehab"): PRIMER turno en turnos individuales de
  // 40 min (1 persona). Ventanas: Lun tarde · Mié mañana y tarde · Vie mañana.
  rehab: {
    slug: "rehab",
    windows: { 1: ["afternoon"], 3: ["morning", "afternoon"], 5: ["morning"] },
    message:
      "Tu primer turno de kinesiología debe ser lunes a la tarde, miércoles (mañana o tarde), o viernes a la mañana.",
    emptyMessage:
      "No hay turnos disponibles para tu primer turno de kinesiología en los próximos días.",
    // Modo especial: el primer turno se ofrece en turnos individuales de 40 min.
    firstTimeSlotMinutes: 40,
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

/** Slug interno de Kinesiología (estable; el nombre visible es "Kinesiología"). */
export const KINESIO_SLUG = "rehab";

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

// ── Modo "turnos individuales de 40 min" (caso especial: kinesio primer turno) ──

/**
 * ÚNICO punto de decisión del caso especial. Devuelve `true` SOLO si el servicio
 * tiene modo de turnos individuales (firstTimeSlotMinutes) Y es el primer turno
 * del paciente. En cualquier otro caso `false` → todo funciona como siempre.
 */
export function usesIndividualFirstTime(
  slug: string | null | undefined,
  esPrimerTurno: boolean,
): boolean {
  if (!esPrimerTurno) return false;
  const rule = getFirstTimeRule(slug);
  return Boolean(rule?.firstTimeSlotMinutes);
}

function minutesToHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Grilla de turnos individuales de un día para una regla con
 * `firstTimeSlotMinutes`. Cada ventana arranca en su hora de inicio y avanza de
 * a `firstTimeSlotMinutes`, incluyendo SOLO los turnos que cierran COMPLETOS
 * dentro de la ventana. Devuelve `[]` si la regla no tiene modo individual o el
 * día no está en ventana. Fuente única para UI y validación de servidor.
 */
export function firstTimeGrid(
  rule: FirstTimeRule,
  dayOfWeek: number,
): { start: string; end: string }[] {
  const dur = rule.firstTimeSlotMinutes;
  if (!dur) return [];
  const shifts = rule.windows[dayOfWeek];
  if (!shifts) return [];
  const out: { start: string; end: string }[] = [];
  for (const s of shifts) {
    const { startHour, endHour } = SHIFTS[s];
    const startM = startHour * 60;
    const endM = endHour * 60;
    for (let t = startM; t + dur <= endM; t += dur) {
      out.push({ start: minutesToHM(t), end: minutesToHM(t + dur) });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** ¿`startTime` ("HH:MM") es un turno válido de la grilla de 40 min de ese día? */
export function isValidFirstTimeGridSlot(
  rule: FirstTimeRule,
  dayOfWeek: number,
  startTime: string,
): { valid: boolean; endTime: string | null } {
  const match = firstTimeGrid(rule, dayOfWeek).find((g) => g.start === startTime);
  return { valid: Boolean(match), endTime: match?.end ?? null };
}
