"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarOff, Loader2 } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { type TimeSlot } from "@/types";

interface SlotPickerProps {
  professionalId?: string;
  serviceId?: string;
  /** ISO del slot seleccionado. */
  value?: string;
  onChange: (startsAtISO: string) => void;
}

/**
 * Selector visual de turnos: calendario + grilla de horarios disponibles.
 * Pide los slots reales a /api/slots según profesional, servicio y fecha.
 */
export function SlotPicker({
  professionalId,
  serviceId,
  value,
  onChange,
}: SlotPickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [slots, setSlots] = React.useState<TimeSlot[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const ready = Boolean(professionalId && serviceId);

  React.useEffect(() => {
    if (!ready || !date) {
      setSlots([]);
      return;
    }

    const controller = new AbortController();
    const dateKey = format(date, "yyyy-MM-dd");

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      professionalId: professionalId!,
      serviceId: serviceId!,
      date: dateKey,
    });

    fetch(`/api/slots?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los horarios");
        return res.json() as Promise<{ slots: TimeSlot[] }>;
      })
      .then((data) => setSlots(data.slots))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("No se pudieron cargar los horarios. Intentá de nuevo.");
        setSlots([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [ready, date, professionalId, serviceId]);

  // Resetear selección si cambian profesional/servicio.
  React.useEffect(() => {
    setDate(undefined);
    setSlots([]);
  }, [professionalId, serviceId]);

  if (!ready) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Elegí un profesional y un servicio para ver los horarios disponibles.
      </p>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr]">
      <div className="rounded-lg border">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={{ before: new Date() }}
          weekStartsOn={1}
        />
      </div>

      <div className="min-w-0">
        {!date ? (
          <p className="flex h-full items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Seleccioná una fecha en el calendario.
          </p>
        ) : loading ? (
          <div className="flex h-full min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando horarios…
          </div>
        ) : error ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-destructive">
            {error}
          </p>
        ) : slots.length === 0 ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <CalendarOff className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay horarios disponibles para esta fecha.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const selected = value === slot.startsAt;
              return (
                <button
                  key={slot.startsAt}
                  type="button"
                  onClick={() => onChange(slot.startsAt)}
                  className={cn(
                    "rounded-md border px-2 py-2 text-sm font-medium tabular-nums transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:border-primary hover:bg-accent",
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
