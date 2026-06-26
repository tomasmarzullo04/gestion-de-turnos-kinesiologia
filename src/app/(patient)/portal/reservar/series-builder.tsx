"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarRange, Check, Info, X } from "lucide-react";
import { toast } from "sonner";

import {
  bookSeriesAction,
  getServiceStartTimesAction,
} from "@/app/(patient)/actions";
import {
  ServiceSelector,
  type ServiceOption,
} from "@/components/features/service-selector";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { formatDate, parseLocalDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import {
  type SeriesItemStatus,
  type SeriesResult,
} from "@/server/services/booking.service";

const STATUS_META: Record<
  SeriesItemStatus,
  { label: string; className: string }
> = {
  booked: { label: "Reservado", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  full: { label: "Sin cupo", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  no_slot: { label: "Sin franja ese día", className: "bg-muted text-muted-foreground" },
  already: { label: "Ya tenías turno", className: "bg-muted text-muted-foreground" },
  rehab_window: { label: "Fuera de la ventana de tu 1er REHAB", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  error: { label: "No se pudo", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

interface Props {
  services: ServiceOption[];
  esPrimerRehab: boolean;
  todayKey: string;
  defaultToDate: string;
}

export function SeriesBuilder({ services, esPrimerRehab, todayKey, defaultToDate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [service, setService] = React.useState<ServiceOption | null>(null);
  const [times, setTimes] = React.useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = React.useState(false);
  const [days, setDays] = React.useState<number[]>([]);
  const [startTime, setStartTime] = React.useState("");
  const [toDate, setToDate] = React.useState(defaultToDate);
  const [notes, setNotes] = React.useState("");
  const [result, setResult] = React.useState<SeriesResult | null>(null);

  const restrictRehab = esPrimerRehab && service?.slug === "rehab";

  function handleService(s: ServiceOption) {
    setService(s);
    setStartTime("");
    setTimes([]);
    setLoadingTimes(true);
    void getServiceStartTimesAction(s.id).then((res) => {
      if (res.success) setTimes(res.data);
      else toast.error(res.error);
      setLoadingTimes(false);
    });
  }

  function toggleDay(value: number) {
    setDays((curr) =>
      curr.includes(value) ? curr.filter((d) => d !== value) : [...curr, value],
    );
  }

  const canSubmit =
    Boolean(service) && days.length > 0 && Boolean(startTime) && Boolean(toDate);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !canSubmit) return;
    startTransition(async () => {
      const res = await bookSeriesAction({
        serviceId: service.id,
        daysOfWeek: days,
        startTime,
        toDate,
        notes,
      });
      if (res.success) {
        setResult(res.data);
        if (res.data.booked > 0) router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function closeResult() {
    const hadBooked = (result?.booked ?? 0) > 0;
    setResult(null);
    if (hadBooked) router.push("/portal/turnos");
  }

  return (
    <div className="space-y-4">
      {restrictRehab && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Como es tu primer turno de rehabilitación, solo se reservarán las fechas dentro de la
            ventana permitida (lunes tarde, miércoles, o viernes mañana). El resto se omite.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Servicio</Label>
              <ServiceSelector
                services={services}
                selectedId={service?.id ?? null}
                onSelect={handleService}
              />
            </div>

            <div className={cn("space-y-2", !service && "opacity-50 pointer-events-none")}>
              <Label>Días de la semana</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((d) => {
                  const active = days.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      aria-pressed={active}
                      className={cn(
                        "flex h-9 min-w-[3rem] items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-foreground hover:bg-muted",
                      )}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={cn("space-y-2", !service && "opacity-50 pointer-events-none")}>
                <Label htmlFor="series-time">Horario</Label>
                <Select value={startTime} onValueChange={setStartTime} disabled={loadingTimes || times.length === 0}>
                  <SelectTrigger id="series-time">
                    <SelectValue placeholder={loadingTimes ? "Cargando…" : times.length === 0 ? "Sin horarios" : "Elegí un horario"} />
                  </SelectTrigger>
                  <SelectContent>
                    {times.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t} h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="series-to">Hasta la fecha</Label>
                <Input
                  id="series-to"
                  type="date"
                  min={todayKey}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="series-notes">Notas (opcional)</Label>
              <Textarea
                id="series-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Se aplican a cada turno de la serie."
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarRange className="h-4 w-4" />
                Se reserva un cupo en cada fecha que coincida.
              </p>
              <SubmitButton loading={isPending} loadingText="Reservando…" disabled={!canSubmit}>
                <CalendarCheck className="h-4 w-4" />
                Crear turno fijo
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Resultado de la serie */}
      <Dialog open={Boolean(result)} onOpenChange={(open) => !open && closeResult()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {result && result.booked === result.total
                ? "¡Turno fijo creado!"
                : "Turno fijo creado (con faltantes)"}
            </DialogTitle>
            <DialogDescription>
              {result
                ? `Reservaste ${result.booked} de ${result.total} ${result.total === 1 ? "fecha" : "fechas"}.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {result && result.booked < result.total && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300">
              Algunas fechas no se pudieron reservar (sin cupo o sin franja ese día). Revisá el
              detalle antes de cerrar.
            </p>
          )}

          <div className="max-h-[45vh] space-y-1.5 overflow-y-auto">
            {result?.results.map((r) => {
              const meta = STATUS_META[r.status];
              return (
                <div key={r.date} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 capitalize">
                    {r.status === "booked" ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    {formatDate(parseLocalDateKey(r.date))}
                    <span className="tabular-nums text-muted-foreground">· {r.startTime}{r.endTime ? `–${r.endTime}` : ""} h</span>
                  </span>
                  <Badge variant="secondary" className={meta.className}>
                    {meta.label}
                  </Badge>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button type="button" onClick={closeResult}>
              {result && result.booked > 0 ? "Ir a mis turnos" : "Cerrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
