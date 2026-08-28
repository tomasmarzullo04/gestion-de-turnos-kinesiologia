"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { parseLocalDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export interface DayOption {
  /** Fecha-clave "YYYY-MM-DD" (día de calendario en hora Argentina). */
  date: string;
  /** Unidades reservables libres ese día (cupos por hora, o turnos de 40 min). */
  availableCount: number;
}

interface DayPickerProps {
  days: DayOption[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

/**
 * Selector de día compartido del flujo de reserva: fila con scroll horizontal de
 * tarjetas (día de semana + número + mes + "N libres"/"lleno"). Única fuente del
 * estilo, para que el paso "Elegí el día" se vea idéntico en TODOS los flujos
 * (turnos por hora y primer turno de kinesio de 40 min).
 *
 * La fecha se formatea desde la fecha-clave SIN conversión de TZ (parseLocalDateKey
 * + format), así el día mostrado es el correcto en servidor y navegador.
 */
export function DayPicker({ days, selectedDate, onSelect }: DayPickerProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {days.map((day) => {
        const d = parseLocalDateKey(day.date);
        const active = selectedDate === day.date;
        const soldOut = day.availableCount === 0;
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            aria-pressed={active}
            className={cn(
              "flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-lg border px-3 py-2 shadow-e1 transition-all duration-150 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-e2"
                : "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-e2",
            )}
          >
            <span className="text-[0.7rem] font-medium uppercase">
              {format(d, "EEE", { locale: es })}
            </span>
            <span className="text-lg font-semibold tabular-nums leading-none">
              {format(d, "d")}
            </span>
            <span className="text-[0.7rem] font-medium capitalize -mt-0.5">
              {format(d, "MMM", { locale: es }).replace(/\.$/, "")}
            </span>
            <span
              className={cn(
                "text-[0.7rem]",
                active
                  ? "text-primary-foreground/85"
                  : soldOut
                    ? "text-muted-foreground"
                    : "text-primary",
              )}
            >
              {soldOut ? "lleno" : `${day.availableCount} libres`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
