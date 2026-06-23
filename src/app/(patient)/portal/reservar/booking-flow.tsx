"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarOff,
  Check,
  Info,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { bookSlotAction } from "@/app/(patient)/actions";
import { SlotGrid } from "@/components/features/slot-grid";
import {
  ServiceSelector,
  type ServiceOption,
} from "@/components/features/service-selector";
import { useRealtimeSlots } from "@/lib/hooks/use-realtime-slots";
import { SubmitButton } from "@/components/shared/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { parseLocalDateKey } from "@/lib/datetime";
import { isFirstTimeDayAllowed, isFirstTimeSlotAllowed } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { type DayAvailability, type SlotView } from "@/server/services/slot.service";

interface Props {
  services: ServiceOption[];
  days: DayAvailability[];
  initialDate: string | null;
  initialSlots: SlotView[];
  esPrimeraVez: boolean;
}

const StepHeader = React.memo(function StepHeader({
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
});

export function BookingFlow({ services, days: initialDays, initialDate, initialSlots, esPrimeraVez }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [selectedService, setSelectedService] = React.useState<ServiceOption | null>(null);
  const [days, setDays] = React.useState<DayAvailability[]>(initialDays);
  const [loadingDays, setLoadingDays] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [slots, setSlots] = React.useState<SlotView[]>(initialSlots);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<SlotView | null>(null);
  const [notes, setNotes] = React.useState("");

  // Caché en memoria de las franjas por día ya consultado.
  const cacheRef = React.useRef<Map<string, SlotView[]>>(new Map());
  if (initialDate && !cacheRef.current.has(initialDate)) {
    cacheRef.current.set(initialDate, initialSlots);
  }
  const selectedDateRef = React.useRef<string | null>(initialDate);

  // Cupos en vivo (Realtime).
  useRealtimeSlots(selectedDate, setSlots);

  // ── Filtrado de días por regla de primera vez ──────────────────────────
  const filteredDays = React.useMemo(() => {
    if (!esPrimeraVez) return days;
    return days.filter((day) => {
      const d = parseLocalDateKey(day.date);
      return isFirstTimeDayAllowed(d.getDay());
    });
  }, [days, esPrimeraVez]);

  // ── Filtrado de slots por regla de primera vez ─────────────────────────
  const filteredSlots = React.useMemo(() => {
    if (!esPrimeraVez || !selectedDate) return slots;
    const d = parseLocalDateKey(selectedDate);
    const dayOfWeek = d.getDay();
    return slots.map((slot) => {
      const hour = Number.parseInt(slot.startTime.split(":")[0]!, 10);
      const allowed = isFirstTimeSlotAllowed(dayOfWeek, hour);
      if (!allowed) {
        return { ...slot, available: false, isBlocked: true };
      }
      return slot;
    });
  }, [slots, esPrimeraVez, selectedDate]);

  // ── Fetch de días cuando cambia el servicio ────────────────────────────
  const fetchDays = React.useCallback(async (serviceId: string) => {
    setLoadingDays(true);
    try {
      const res = await fetch(`/api/slots/days?service=${serviceId}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { days: DayAvailability[] };
      setDays(data.days);
    } catch {
      toast.error("No se pudieron cargar los días disponibles.");
      setDays([]);
    } finally {
      setLoadingDays(false);
    }
  }, []);

  const handleServiceSelect = React.useCallback((service: ServiceOption) => {
    setSelectedService(service);
    setSelectedDate(null);
    selectedDateRef.current = null;
    setSelectedSlot(null);
    setSlots([]);
    cacheRef.current.clear();
    // Los días se recargarán vía fetchDays o podemos usar los initialDays
    // filtrados por servicio. Usamos la API de días si existe, o filtramos
    // del listado existente.
    setLoadingDays(true);
    fetch(`/api/slots/days?service=${service.id}`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data: { days: DayAvailability[] }) => setDays(data.days))
      .catch(() => {
        // Fallback: usar initialDays si la API no existe aún
        setDays(initialDays);
      })
      .finally(() => setLoadingDays(false));
  }, [initialDays]);

  const fetchSlots = React.useCallback(
    async (date: string, silent: boolean) => {
      const serviceParam = selectedService ? `&service=${selectedService.id}` : "";
      try {
        const res = await fetch(`/api/slots?date=${date}${serviceParam}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { slots: SlotView[] };
        cacheRef.current.set(date, data.slots);
        if (selectedDateRef.current === date) setSlots(data.slots);
      } catch {
        if (!silent) {
          toast.error("No se pudieron cargar los horarios.");
          if (selectedDateRef.current === date) setSlots([]);
        }
      } finally {
        if (!silent && selectedDateRef.current === date) {
          setLoadingSlots(false);
        }
      }
    },
    [selectedService],
  );

  const selectDay = React.useCallback(
    (date: string) => {
      if (date === selectedDateRef.current) return;
      selectedDateRef.current = date;
      setSelectedDate(date);
      setSelectedSlot(null);

      const cached = cacheRef.current.get(date);
      if (cached) {
        setSlots(cached);
        setLoadingSlots(false);
        void fetchSlots(date, true);
      } else {
        setLoadingSlots(true);
        void fetchSlots(date, false);
      }
    },
    [fetchSlots],
  );

  // Prefetch del día siguiente.
  React.useEffect(() => {
    const idx = filteredDays.findIndex((d) => d.date === selectedDate);
    const nextDay = idx >= 0 ? filteredDays[idx + 1] : undefined;
    if (nextDay && !cacheRef.current.has(nextDay.date)) {
      void fetchSlots(nextDay.date, true);
    }
  }, [selectedDate, filteredDays, fetchSlots]);

  const confirm = React.useCallback(() => {
    if (!selectedSlot || !selectedService) return;
    startTransition(async () => {
      const result = await bookSlotAction({
        slotId: selectedSlot.id,
        serviceId: selectedService.id,
        notes,
      });
      if (result.success) {
        const data = result.data as { isFirstTime?: boolean } | undefined;
        if (data?.isFirstTime) {
          toast.success("¡Turno reservado! Tratamiento de 1 mes asignado.", {
            icon: <Sparkles className="h-4 w-4 text-amber-400" />,
            duration: 6000,
          });
        } else {
          toast.success("¡Turno reservado! Te esperamos.");
        }
        router.push("/portal/turnos");
      } else {
        toast.error(result.error);
        const cur = selectedDateRef.current;
        if (cur) {
          cacheRef.current.delete(cur);
          setLoadingSlots(true);
          void fetchSlots(cur, false);
        }
        setSelectedSlot(null);
      }
    });
  }, [selectedSlot, selectedService, notes, router, fetchSlots]);

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarOff className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No hay servicios configurados</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              El estudio todavía no tiene servicios activos. Contactá a recepción.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner de primera vez */}
      {esPrimeraVez && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Esta es tu primera consulta
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
              Los horarios disponibles están limitados a: <strong>Lunes (tarde)</strong>,{" "}
              <strong>Miércoles (todo el día)</strong> o <strong>Viernes (mañana)</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Paso 1 — Servicio */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <StepHeader step={1} title="Elegí el servicio" done={Boolean(selectedService)} />
          <ServiceSelector
            services={services}
            selectedId={selectedService?.id ?? null}
            onSelect={handleServiceSelect}
          />
        </CardContent>
      </Card>

      {/* Paso 2 — Día */}
      <Card className={cn("transition-opacity duration-300", !selectedService && "opacity-55 pointer-events-none")}>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <StepHeader step={2} title="Elegí el día" done={Boolean(selectedDate)} />
          {loadingDays ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[5.5rem] w-[4.5rem] shrink-0 rounded-lg" />
              ))}
            </div>
          ) : filteredDays.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay días disponibles para este servicio.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {filteredDays.map((day) => {
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
                      {soldOut ? "lleno" : `${day.availableSlots} libres`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paso 3 — Horario */}
      <Card className={cn("transition-opacity duration-300", !selectedDate && "opacity-55")}>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <StepHeader step={3} title="Elegí el horario" done={Boolean(selectedSlot)} />
          {esPrimeraVez && selectedDate && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Los horarios bloqueados no aplican para primera consulta.</span>
            </div>
          )}
          {loadingSlots ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[4.75rem] w-full rounded-lg" />
              ))}
            </div>
          ) : filteredSlots.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay horarios para este día.
            </p>
          ) : (
            <SlotGrid
              slots={filteredSlots}
              selectedId={selectedSlot?.id ?? null}
              onSelect={setSelectedSlot}
            />
          )}
        </CardContent>
      </Card>

      {/* Paso 4 — Confirmar */}
      <Card className={cn("transition-opacity duration-300", !selectedSlot && "opacity-55 pointer-events-none")}>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <StepHeader step={4} title="Confirmá" done={false} />
          {selectedSlot && selectedService && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: selectedService.color }}
              >
                {selectedService.name}
              </span>
              <span>·</span>
              <span>
                Reservás el bloque de{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {selectedSlot.startTime}–{selectedSlot.endTime} h
                </span>
              </span>
            </div>
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
