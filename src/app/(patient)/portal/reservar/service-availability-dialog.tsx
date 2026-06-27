"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarOff, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { type ServiceOption } from "@/components/features/service-selector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseLocalDateKey } from "@/lib/datetime";
import {
  isRehabFirstTimeDayAllowed,
  isRehabFirstTimeSlotAllowed,
} from "@/lib/rehab-first-time";
import { cn } from "@/lib/utils";
import { type SlotView } from "@/server/services/slot.service";

interface DayAvail {
  date: string;
  slots: SlotView[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceOption | null;
  restrictRehab: boolean;
  onPick: (date: string, daySlots: SlotView[], slot: SlotView) => void;
}

export function ServiceAvailabilityDialog({
  open,
  onOpenChange,
  service,
  restrictRehab,
  onPick,
}: Props) {
  const [days, setDays] = React.useState<DayAvail[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !service) return;
    let active = true;
    setLoading(true);
    setDays([]);
    fetch(`/api/slots/availability?service=${service.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { days: DayAvail[] }) => {
        if (active) setDays(data.days);
      })
      .catch(() => {
        if (active) {
          toast.error("No se pudo cargar la disponibilidad.");
          setDays([]);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, service]);

  // Filtrado por ventana del primer REHAB (misma regla que el flujo).
  const view = React.useMemo(() => {
    if (!restrictRehab) return days;
    return days
      .filter((d) => isRehabFirstTimeDayAllowed(parseLocalDateKey(d.date).getDay()))
      .map((d) => {
        const dow = parseLocalDateKey(d.date).getDay();
        return {
          date: d.date,
          slots: d.slots.filter((s) =>
            isRehabFirstTimeSlotAllowed(dow, Number.parseInt(s.startTime.split(":")[0]!, 10)),
          ),
        };
      })
      .filter((d) => d.slots.length > 0);
  }, [days, restrictRehab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {service && (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: service.color }}
                aria-hidden="true"
              />
            )}
            Disponibilidad de {service?.name}
          </DialogTitle>
          <DialogDescription>
            Días, horarios y cupos libres. Tocá una franja para reservar.
          </DialogDescription>
        </DialogHeader>

        {restrictRehab && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Por ser tu primer turno de rehabilitación, solo se muestran los horarios que podés
              reservar (lunes tarde, miércoles, o viernes mañana).
            </span>
          </div>
        )}

        <div className="-mx-2 max-h-[55vh] overflow-y-auto px-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando disponibilidad…
            </div>
          ) : view.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarOff className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Sin disponibilidad próxima</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Este servicio no tiene horarios disponibles en los próximos días.
              </p>
            </div>
          ) : (
            <ul className="space-y-3 py-1">
              {view.map((d) => {
                const date = parseLocalDateKey(d.date);
                return (
                  <li key={d.date}>
                    <p className="mb-1.5 text-sm font-medium capitalize">
                      {format(date, "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {d.slots.map((s) => {
                        const pickable = s.available;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={!pickable}
                            onClick={() => onPick(d.date, d.slots, s)}
                            className={cn(
                              "flex flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              pickable
                                ? "hover:border-primary/50 hover:bg-primary/5"
                                : "cursor-not-allowed opacity-60",
                            )}
                          >
                            <span className="text-sm font-medium tabular-nums">
                              {s.startTime}–{s.endTime}
                            </span>
                            <span
                              className={cn(
                                "text-xs tabular-nums",
                                pickable ? "text-primary" : "text-muted-foreground",
                              )}
                            >
                              {s.remaining > 0
                                ? `${s.remaining} ${s.remaining === 1 ? "lugar" : "lugares"}`
                                : "Completo"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
