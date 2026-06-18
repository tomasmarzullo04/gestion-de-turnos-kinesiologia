"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarCheck, CalendarOff, Check } from "lucide-react";
import { toast } from "sonner";

import { bookSlotAction } from "@/app/(patient)/actions";
import { SlotGrid } from "@/components/features/slot-grid";
import { SubmitButton } from "@/components/shared/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { parseLocalDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { type DayAvailability, type SlotView } from "@/server/services/slot.service";

interface Props {
  days: DayAvailability[];
  initialDate: string | null;
  initialSlots: SlotView[];
}

function StepHeader({
  step,
  title,
  done,
}: {
  step: number;
  title: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "border-primary text-primary",
        )}
      >
        {done ? <Check className="h-4 w-4" /> : step}
      </span>
      <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

export function BookingFlow({ days, initialDate, initialSlots }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [selectedDate, setSelectedDate] = React.useState<string | null>(initialDate);
  const [slots, setSlots] = React.useState<SlotView[]>(initialSlots);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<SlotView | null>(null);
  const [notes, setNotes] = React.useState("");

  async function selectDay(date: string) {
    if (date === selectedDate) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/slots?date=${date}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { slots: SlotView[] };
      setSlots(data.slots);
    } catch {
      toast.error("No se pudieron cargar los horarios.");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  function confirm() {
    if (!selectedSlot) return;
    startTransition(async () => {
      const result = await bookSlotAction({ slotId: selectedSlot.id, notes });
      if (result.success) {
        toast.success("¡Turno reservado! Te esperamos.");
        router.push("/portal/turnos");
      } else {
        toast.error(result.error);
        // Refrescar la grilla por si el cupo cambió mientras tanto.
        if (selectedDate) void selectDay(selectedDate);
        setSelectedSlot(null);
      }
    });
  }

  if (days.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarOff className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No hay franjas disponibles por ahora</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Todavía no se publicó la agenda. Volvé a intentar más tarde.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Paso 1 — día */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <StepHeader step={1} title="Elegí el día" done={Boolean(selectedDate)} />
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((day) => {
              const d = parseLocalDateKey(day.date);
              const active = selectedDate === day.date;
              const soldOut = day.availableSlots === 0;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => selectDay(day.date)}
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
                    {soldOut ? "lleno" : `${day.availableSlots} libres`}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Paso 2 — horario */}
      <Card className={cn("transition-opacity duration-300", !selectedDate && "opacity-55")}>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <StepHeader step={2} title="Elegí el horario" done={Boolean(selectedSlot)} />
          {loadingSlots ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[4.75rem] w-full rounded-lg" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay horarios para este día.
            </p>
          ) : (
            <SlotGrid
              slots={slots}
              selectedId={selectedSlot?.id ?? null}
              onSelect={setSelectedSlot}
            />
          )}
        </CardContent>
      </Card>

      {/* Paso 3 — confirmar */}
      <Card className={cn("transition-opacity duration-300", !selectedSlot && "opacity-55 pointer-events-none")}>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <StepHeader step={3} title="Confirmá" done={false} />
          {selectedSlot && (
            <p className="text-sm text-muted-foreground">
              Reservás el bloque de{" "}
              <span className="font-medium text-foreground tabular-nums">
                {selectedSlot.startTime}–{selectedSlot.endTime} h
              </span>
              .
            </p>
          )}
          <div className="space-y-2">
            <Label>Notas para el profesional</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo de consulta, lesión, etc. (opcional)"
            />
          </div>
          <div className="flex justify-end">
            <SubmitButton
              type="button"
              size="lg"
              loading={isPending}
              loadingText="Reservando…"
              onClick={confirm}
              disabled={!selectedSlot}
            >
              <CalendarCheck className="h-4 w-4" />
              Confirmar turno
            </SubmitButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
