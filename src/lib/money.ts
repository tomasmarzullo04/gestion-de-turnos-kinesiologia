/** Formato de moneda (ARS, sin centavos) para toda la app. */
const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatARS(amount: number): string {
  return ARS.format(amount);
}

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Nombre del mes (1–12). */
export function monthName(month: number): string {
  return MONTHS[month - 1] ?? "—";
}

/** Mes anterior / siguiente, con wrap de año. */
export function shiftMonth(
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
