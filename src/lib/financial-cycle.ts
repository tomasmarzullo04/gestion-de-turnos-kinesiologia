import { addDays, format, parse } from "date-fns";

/**
 * Ciclo financiero "del 15 al 15" (Finanzas).
 *
 * El período de Finanzas NO es el mes calendario: el negocio cierra el día 15
 * (por el alquiler). Un ciclo va del día de corte de un mes al día ANTERIOR al
 * corte del mes siguiente, inclusive. Ej: el ciclo "de agosto" abarca del
 * 15/08 al 14/09 inclusive.
 *
 * IDENTIDAD DEL CICLO: `(month, year)` = mes/año en que el ciclo ARRANCA (el
 * día de corte). Así, el ciclo (8, 2026) = 15/08/2026 → 14/09/2026.
 *
 * Configurable: el día de cierre vive en una sola constante. Si a futuro el
 * cierre cambia de día, se ajusta acá y todo Finanzas lo respeta.
 */
export const FINANCIAL_CYCLE_START_DAY = 15;

/** Nombres cortos de mes (es), para el label del período. */
const SHORT_MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Mes/año del ciclo desplazado `delta` ciclos (wrap de año). Idéntico a mover mes. */
export function shiftCycle(
  month: number,
  year: number,
  delta: number,
): { month: number; year: number } {
  const zero = month - 1 + delta;
  return {
    month: ((zero % 12) + 12) % 12 + 1,
    year: year + Math.floor(zero / 12),
  };
}

export interface CycleRange {
  /** Inicio del ciclo, inclusive. "YYYY-MM-DD" (ej. "2026-08-15"). */
  startKey: string;
  /** Fin del ciclo, EXCLUSIVE (inicio del siguiente). "YYYY-MM-DD" (ej. "2026-09-15"). */
  endExclusiveKey: string;
  /** Último día del ciclo, inclusive. "YYYY-MM-DD" (ej. "2026-09-14"). */
  endInclusiveKey: string;
}

/**
 * Rango de fechas de calendario de un ciclo, a partir de su mes/año de inicio.
 * Half-open [startKey, endExclusiveKey): ciclos contiguos que no se solapan ni
 * dejan huecos → cada pago cae en exactamente un ciclo.
 */
export function getCycleRange(month: number, year: number): CycleRange {
  const day = FINANCIAL_CYCLE_START_DAY;
  const startKey = `${year}-${pad2(month)}-${pad2(day)}`;
  const nextStart = shiftCycle(month, year, 1);
  const endExclusiveKey = `${nextStart.year}-${pad2(nextStart.month)}-${pad2(day)}`;
  // Último día inclusive = día anterior al corte siguiente (robusto para
  // cualquier día de corte, sin asumir 30/31 ni bisiestos).
  const endInclusiveKey = format(addDays(parse(endExclusiveKey, "yyyy-MM-dd", new Date()), -1), "yyyy-MM-dd");
  return { startKey, endExclusiveKey, endInclusiveKey };
}

/**
 * Ciclo actual según la fecha de hoy (en TZ de la consultoría; `todayKey` ya
 * viene en hora local). Si hoy es ≥ día de corte, el ciclo arranca este mes;
 * si es anterior, arrancó el mes pasado.
 */
export function getCurrentCycle(todayKey: string): { month: number; year: number } {
  const [yStr, mStr, dStr] = todayKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (d >= FINANCIAL_CYCLE_START_DAY) return { month: m, year: y };
  return shiftCycle(m, y, -1);
}

/**
 * Label del período para la UI: rango real que abarca el ciclo, sin ambigüedad.
 * Ej. "15 ago – 14 sep 2026". Si el ciclo cruza fin de año muestra ambos años
 * (ej. "15 dic 2026 – 14 ene 2027").
 */
export function formatCycleLabel(month: number, year: number): string {
  const { startKey, endInclusiveKey } = getCycleRange(month, year);
  const [sY, sM, sD] = startKey.split("-").map(Number);
  const [eY, eM, eD] = endInclusiveKey.split("-").map(Number);
  const start = `${sD} ${SHORT_MONTHS[(sM ?? 1) - 1]}`;
  const end = `${eD} ${SHORT_MONTHS[(eM ?? 1) - 1]}`;
  if (sY === eY) return `${start} – ${end} ${eY}`;
  return `${start} ${sY} – ${end} ${eY}`;
}
