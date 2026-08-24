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

import { formatDateKey } from "@/lib/datetime";

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

// ── Excepciones puntuales por FECHA (bloqueo de PRIMER turno) ─────────────────

/** Sustantivo del servicio para los mensajes al primerizo (por slug estable). */
const FIRST_TIME_SERVICE_NOUN: Record<string, string> = {
  rehab: "kinesiología",
  gym: "gimnasio",
};

/**
 * Excepciones puntuales por FECHA: días en los que NO se ofrece ni se permite el
 * PRIMER turno de un servicio (SOLO a primerizos —quienes aún no asistieron—).
 * Clave = slug estable del servicio; valor = fechas "YYYY-MM-DD" en hora de
 * Argentina.
 *
 * - Auto-expira: pasada la fecha deja de afectar sola (la disponibilidad solo
 *   mira días futuros); no hay que borrar nada.
 * - No es un `if` con la fecha suelta: es una lista configurable y reusable.
 * - NO afecta a no-primerizos, ni a otros servicios, ni a otros días, ni a la
 *   carga manual del profesional (adminBook).
 */
export const FIRST_TIME_BLOCKED_DATES: Record<string, string[]> = {
  // Miércoles 26/08/2026: sin primeros turnos online de Kine ni GYM.
  rehab: ["2026-08-26"],
  gym: ["2026-08-26"],
};

/**
 * ¿La fecha (clave "YYYY-MM-DD" en hora Argentina) está bloqueada para el PRIMER
 * turno de ese servicio? `dateKey` debe venir ya en hora local (ver `TIMEZONE`),
 * no en UTC, para no bloquear el día equivocado en el borde de medianoche.
 */
export function isFirstTimeDateBlocked(
  slug: string | null | undefined,
  dateKey: string,
): boolean {
  if (!slug) return false;
  const dates = FIRST_TIME_BLOCKED_DATES[slug];
  return Array.isArray(dates) && dates.includes(dateKey);
}

/**
 * Mensaje claro y amable para el primerizo cuando su fecha está bloqueada. El
 * día se muestra en hora de Argentina (formateo de fecha-clave, sin correr el
 * día). Ej: "Los primeros turnos de kinesiología no están disponibles el
 * miércoles 26 de agosto de 2026. Podés elegir otro día."
 */
export function firstTimeBlockedMessage(slug: string, dateKey: string): string {
  const noun = FIRST_TIME_SERVICE_NOUN[slug] ?? "este servicio";
  return `Los primeros turnos de ${noun} no están disponibles el ${formatDateKey(dateKey)}. Podés elegir otro día.`;
}

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

function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

const NOON_MINUTES = 12 * 60;

export type Franja = { start: string; end: string };

/**
 * Clasifica una franja de la plantilla en "mañana" o "tarde" según el corte del
 * mediodía (12:00): termina ≤ 12:00 = mañana; empieza ≥ 12:00 = tarde. Devuelve
 * `null` si la franja CRUZA el mediodía (caso a reportar; no se clasifica).
 */
export function classifyFranja(franja: Franja): "morning" | "afternoon" | null {
  const s = hmToMinutes(franja.start);
  const e = hmToMinutes(franja.end);
  if (e <= NOON_MINUTES) return "morning";
  if (s >= NOON_MINUTES) return "afternoon";
  return null; // cruza el mediodía
}

/**
 * Grilla de turnos individuales de 40 min = INTERSECCIÓN de:
 *  - PLANTILLA: las franjas reales del servicio ese día (horarios/cortes) →
 *    `franjas`. Los turnos reinician en el inicio de CADA franja y solo se
 *    incluyen los que cierran COMPLETOS dentro de ella.
 *  - REGLA DE NEGOCIO: qué parte del día se ofrece (`rule.windows[dow]`:
 *    "morning"/"afternoon"). Solo se tilan las franjas cuya parte del día está
 *    permitida por la regla.
 *
 * NO usa horarios hardcodeados: los cortes salen de la plantilla. `SHIFTS` queda
 * solo para la regla por hora de GYM.
 */
export function firstTimeGridFromFranjas(
  rule: FirstTimeRule,
  dayOfWeek: number,
  franjas: Franja[],
): { start: string; end: string }[] {
  const dur = rule.firstTimeSlotMinutes;
  if (!dur) return [];
  const allowed = rule.windows[dayOfWeek];
  if (!allowed || allowed.length === 0) return [];
  const allowAll = allowed.includes("full");
  const allowedSet = new Set(allowed);

  const out: { start: string; end: string }[] = [];
  for (const f of franjas) {
    if (!allowAll) {
      const cls = classifyFranja(f);
      if (!cls || !allowedSet.has(cls)) continue;
    }
    const startM = hmToMinutes(f.start);
    const endM = hmToMinutes(f.end);
    for (let t = startM; t + dur <= endM; t += dur) {
      out.push({ start: minutesToHM(t), end: minutesToHM(t + dur) });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** ¿`startTime` es un turno válido de la grilla intersectada (plantilla ∩ regla)? */
export function isValidFirstTimeGridSlot(
  rule: FirstTimeRule,
  dayOfWeek: number,
  franjas: Franja[],
  startTime: string,
): { valid: boolean; endTime: string | null } {
  const match = firstTimeGridFromFranjas(rule, dayOfWeek, franjas).find(
    (g) => g.start === startTime,
  );
  return { valid: Boolean(match), endTime: match?.end ?? null };
}
