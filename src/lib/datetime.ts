import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { TIMEZONE } from "@/lib/constants";

/**
 * Utilidades de fecha/hora centradas en la zona horaria de la consultoría.
 *
 * Convención:
 *  - En base de datos los turnos se guardan en UTC (`Date`).
 *  - La disponibilidad se define en hora LOCAL ("HH:mm" + dayOfWeek).
 *  - Para mostrar al usuario, convertimos UTC → hora local de la consultoría.
 */

/** Convierte una fecha/hora "de pared" local de la consultoría a un Date UTC. */
export function zonedToUtc(date: Date): Date {
  return fromZonedTime(date, TIMEZONE);
}

/** Convierte un Date (UTC) a la hora "de pared" de la consultoría. */
export function utcToZoned(date: Date): Date {
  return toZonedTime(date, TIMEZONE);
}

/**
 * Construye un Date UTC a partir de un día (en hora local) y un "HH:mm" local.
 * `day` se interpreta por su parte calendario (año/mes/día) en la TZ local.
 */
export function combineDateAndTime(day: Date, time: string): Date {
  const [hours = 0, minutes = 0] = time.split(":").map((n) => Number.parseInt(n, 10));
  const localWall = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours,
    minutes,
    0,
    0,
  );
  return zonedToUtc(localWall);
}

/** "HH:mm" → cantidad de minutos desde la medianoche. */
export function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map((n) => Number.parseInt(n, 10));
  return hours * 60 + minutes;
}

/** Minutos desde medianoche → "HH:mm". */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Valida un string "HH:mm" (00:00–23:59). */
export function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// ── Formateo de FECHAS-CLAVE de calendario ("YYYY-MM-DD") ────────────────────
//
// IMPORTANTE: estos formateadores son para fechas de CALENDARIO puras (p. ej.
// `booking.date` = "2026-08-21"), que NO tienen hora ni zona horaria. Formatean
// la fecha tal cual, SIN conversión de TZ, así el día mostrado es el mismo en el
// servidor (UTC) y en el navegador (Argentina). Fuente de verdad única para
// mostrar el DÍA de un turno.
//
// NO usar para instantes reales (timestamptz: now(), created_at, asistencia con
// hora real): para eso está la conversión utcToZoned/zonedToUtc.

/** Fecha-clave "YYYY-MM-DD" → "viernes 21 de agosto de 2026" (sin conversión de TZ). */
export function formatDateKey(key: string): string {
  return format(parseLocalDateKey(key), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}

/** Fecha-clave "YYYY-MM-DD" → "21/08/2026" (sin conversión de TZ). */
export function formatDateKeyShort(key: string): string {
  return format(parseLocalDateKey(key), "dd/MM/yyyy", { locale: es });
}

/** Devuelve "YYYY-MM-DD" en la TZ de la consultoría (útil como key de día). */
export function toLocalDateKey(date: Date): string {
  return format(utcToZoned(date), "yyyy-MM-dd");
}

/** Parsea "YYYY-MM-DD" como fecha de calendario local (sin desfase de TZ). */
export function parseLocalDateKey(key: string): Date {
  return parse(key, "yyyy-MM-dd", new Date());
}
