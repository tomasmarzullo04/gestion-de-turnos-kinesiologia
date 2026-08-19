"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarClock, CalendarOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  bookFirstTimeKinesioAction,
  getFirstTimeKinesioAvailabilityAction,
} from "@/app/(patient)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateKey, formatDateKeyShort } from "@/lib/datetime";
import { cn } from "@/lib/utils";

interface Turno {
  startTime: string;
  endTime: string;
  available: boolean;
}
interface DayAvail {
  date: string;
  turnos: Turno[];
}

/**
 * Reserva del PRIMER turno de Kinesiología: turnos individuales de 40 min (1
 * persona). Solo se renderiza cuando `usesIndividualFirstTime(kinesio, primerizo)`.
 * Es un flujo aparte: no toca la reserva por hora del resto del sistema.
 */
export function FirstTimeKinesioBooking() {
  const router = useRouter();
  const [days, setDays] = React.useState<DayAvail[]>([]);
  const [alreadyBooked, setAlreadyBooked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Turno | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const load = React.useCallback(() => {
    setLoading(true);
    void getFirstTimeKinesioAvailabilityAction().then((res) => {
      if (res.success) {
        setDays(res.data.days);
        setAlreadyBooked(res.data.alreadyBooked);
      } else toast.error(res.error);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const day = days.find((d) => d.date === selectedDate) ?? null;

  function confirm() {
    if (!selectedDate || !selected) return;
    startTransition(async () => {
      const res = await bookFirstTimeKinesioAction({
        date: selectedDate,
        startTime: selected.startTime,
      });
      if (res.success) {
        toast.success("¡Turno reservado! Te esperamos.");
        router.push("/portal/turnos");
      } else {
        toast.error(res.error);
        setSelected(null);
        load(); // re-sincronizamos disponibilidad (quizás lo tomó otra persona)
      }
    });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5 sm:p-6">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alreadyBooked) {
    return (
      <Card>
        <CardContent className="p-5 sm:p-6">
          <EmptyState
            icon={CalendarClock}
            title="Ya tenés tu primer turno reservado"
            description="El primer turno de kinesiología se reserva una sola vez. Cuando asistas, vas a poder sacar turnos normales. Podés ver tu turno en la sección Mis turnos."
          />
        </CardContent>
      </Card>
    );
  }

  if (days.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 sm:p-6">
          <EmptyState
            icon={CalendarOff}
            title="Sin turnos disponibles"
            description="No hay turnos para tu primer turno de kinesiología en los próximos días. Probá más adelante o contactá a recepción."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="text-sm font-medium">Elegí el día</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => {
              const active = selectedDate === d.date;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(d.date);
                    setSelected(null);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <span className="text-xs font-medium capitalize">{formatDateKeyShort(d.date)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {day && (
          <div className="space-y-2">
            <p className="text-sm font-medium capitalize">
              Turnos del {formatDateKey(day.date)}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {day.turnos.map((t) => {
                const active = selected?.startTime === t.startTime;
                return (
                  <button
                    key={t.startTime}
                    type="button"
                    disabled={!t.available}
                    onClick={() => setSelected(t)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-start rounded-lg border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-primary/40 hover:bg-muted",
                    )}
                  >
                    <span className="font-medium tabular-nums">
                      {t.startTime}–{t.endTime}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.available ? "40 min · individual" : "Ocupado"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selected && (
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground tabular-nums">
              {selected.startTime}–{selected.endTime} h · 40 min
            </p>
            <Button type="button" onClick={confirm} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
              Confirmar turno
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
