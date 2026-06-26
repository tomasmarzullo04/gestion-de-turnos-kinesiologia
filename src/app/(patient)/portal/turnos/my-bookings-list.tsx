"use client";

import * as React from "react";
import { CalendarClock, CalendarRange, History, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { cancelBookingAction, cancelSeriesAction } from "@/app/(patient)/actions";
import { BookingCard } from "@/components/features/booking-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { parseLocalDateKey } from "@/lib/datetime";
import { type MyBooking } from "@/server/services/booking.service";

interface Props {
  upcoming: MyBooking[];
  past: MyBooking[];
  cancellationMinHours: number;
}

type Item =
  | { type: "single"; booking: MyBooking }
  | { type: "series"; recurrenceId: string; bookings: MyBooking[] };

/** Agrupa los turnos próximos: las series (turnos fijos) juntas, en orden. */
function groupUpcoming(upcoming: MyBooking[]): Item[] {
  const items: Item[] = [];
  const seen = new Set<string>();
  for (const b of upcoming) {
    if (!b.recurrenceId) {
      items.push({ type: "single", booking: b });
      continue;
    }
    if (seen.has(b.recurrenceId)) continue;
    seen.add(b.recurrenceId);
    items.push({
      type: "series",
      recurrenceId: b.recurrenceId,
      bookings: upcoming.filter((x) => x.recurrenceId === b.recurrenceId),
    });
  }
  return items;
}

function seriesPattern(bookings: MyBooking[]): string {
  const dows = new Set(bookings.map((b) => parseLocalDateKey(b.date).getDay()));
  const labels = DAYS_OF_WEEK.filter((d) => dows.has(d.value)).map((d) => d.short);
  const time = bookings[0]?.startTime ?? "";
  return `${labels.join(", ")} · ${time} h`;
}

export function MyBookingsList({ upcoming, past, cancellationMinHours }: Props) {
  const [cancelling, setCancelling] = React.useState<MyBooking | null>(null);
  const [cancellingSeries, setCancellingSeries] = React.useState<{
    recurrenceId: string;
    count: number;
    name: string | null;
  } | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const items = React.useMemo(() => groupUpcoming(upcoming), [upcoming]);

  function handleCancel() {
    if (!cancelling) return;
    startTransition(async () => {
      const result = await cancelBookingAction({ bookingId: cancelling.id });
      if (result.success) toast.success("Turno cancelado. Liberaste el cupo.");
      else toast.error(result.error);
      setCancelling(null);
    });
  }

  function handleCancelSeries() {
    if (!cancellingSeries) return;
    startTransition(async () => {
      const result = await cancelSeriesAction({
        recurrenceId: cancellingSeries.recurrenceId,
      });
      if (result.success) {
        toast.success(
          `Serie cancelada. Liberaste ${result.data.cancelled} ${result.data.cancelled === 1 ? "cupo" : "cupos"}.`,
        );
      } else {
        toast.error(result.error);
      }
      setCancellingSeries(null);
    });
  }

  const cancelAction = (booking: MyBooking) => (
    <Button variant="outline" size="sm" onClick={() => setCancelling(booking)}>
      <X className="h-4 w-4" />
      Cancelar
    </Button>
  );

  return (
    <>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <CalendarClock className="h-4 w-4" />
            Próximos ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-1.5">
            <History className="h-4 w-4" />
            Historial ({past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No tenés turnos próximos"
              description="Empezá reservando tu primer turno de entrenamiento."
              action={
                <Button asChild className="mt-2">
                  <Link href="/portal/reservar">Reservar turno</Link>
                </Button>
              }
            />
          ) : (
            items.map((item) =>
              item.type === "single" ? (
                <BookingCard
                  key={item.booking.id}
                  booking={item.booking}
                  action={cancelAction(item.booking)}
                />
              ) : (
                <div
                  key={item.recurrenceId}
                  className="space-y-3 rounded-xl border border-primary/20 bg-primary/[0.03] p-3 sm:p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="gap-1">
                        <CalendarRange className="h-3.5 w-3.5" />
                        Turno fijo
                      </Badge>
                      <span className="text-sm font-medium">
                        {item.bookings[0]?.serviceName ?? "Serie"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {seriesPattern(item.bookings)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setCancellingSeries({
                          recurrenceId: item.recurrenceId,
                          count: item.bookings.length,
                          name: item.bookings[0]?.serviceName ?? null,
                        })
                      }
                    >
                      <X className="h-4 w-4" />
                      Cancelar serie
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {item.bookings.map((b) => (
                      <BookingCard key={b.id} booking={b} action={cancelAction(b)} />
                    ))}
                  </div>
                </div>
              ),
            )
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <EmptyState
              icon={History}
              title="Aún no tenés historial"
              description="Acá vas a ver tus turnos pasados y cancelados una vez que empieces a entrenar."
            />
          ) : (
            past.map((booking) => (
              <BookingCard key={booking.id} booking={booking} muted />
            ))
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancelar turno"
        description={`Podés cancelar con al menos ${cancellationMinHours}h de antelación. Se liberará tu cupo. ¿Confirmás?`}
        confirmLabel="Sí, cancelar"
        cancelLabel="No"
        destructive
        loading={isPending}
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={Boolean(cancellingSeries)}
        onOpenChange={(open) => !open && setCancellingSeries(null)}
        title="Cancelar turno fijo"
        description={
          cancellingSeries
            ? `Se cancelarán los ${cancellingSeries.count} turnos futuros de la serie${cancellingSeries.name ? ` de ${cancellingSeries.name}` : ""} y se liberarán esos cupos. Los turnos pasados no se tocan. ¿Confirmás?`
            : ""
        }
        confirmLabel="Sí, cancelar serie"
        cancelLabel="No"
        destructive
        loading={isPending}
        onConfirm={handleCancelSeries}
      />
    </>
  );
}
