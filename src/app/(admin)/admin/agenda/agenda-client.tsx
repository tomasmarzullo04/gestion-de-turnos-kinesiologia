"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarCog, RefreshCw, Users, X } from "lucide-react";
import { toast } from "sonner";

import {
  adminCancelBookingAction,
  generateAgendaAction,
  toggleSlotBlockedAction,
} from "@/app/(admin)/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { parseLocalDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import {
  type AdminSlotView,
  type DayAvailability,
  type SlotAttendee,
} from "@/server/services/slot.service";

interface Props {
  days: DayAvailability[];
  selectedDate: string;
  slots: AdminSlotView[];
}

export function AgendaClient({ days, selectedDate, slots }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [cancelTarget, setCancelTarget] = React.useState<SlotAttendee | null>(
    null,
  );

  function generate() {
    startTransition(async () => {
      const result = await generateAgendaAction();
      if (result.success) {
        toast.success(
          result.data > 0
            ? `Agenda actualizada: ${result.data} franjas nuevas.`
            : "La agenda ya estaba al día.",
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function toggleBlock(slot: AdminSlotView) {
    startTransition(async () => {
      const result = await toggleSlotBlockedAction({
        slotId: slot.id,
        blocked: !slot.isBlocked,
      });
      if (result.success) {
        toast.success(slot.isBlocked ? "Franja reabierta" : "Franja cerrada");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function cancelBooking() {
    if (!cancelTarget) return;
    startTransition(async () => {
      const result = await adminCancelBookingAction({
        bookingId: cancelTarget.bookingId,
      });
      if (result.success) {
        toast.success("Reserva cancelada");
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setCancelTarget(null);
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={generate} disabled={isPending}>
          {isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarCog className="h-4 w-4" />
          )}
          Generar / actualizar agenda
        </Button>
      </div>

      {days.length === 0 ? (
        <EmptyState
          icon={CalendarCog}
          title="No hay franjas generadas"
          description="Generá la agenda a partir de las plantillas activas para ver los días."
        />
      ) : (
        <>
          {/* Selector de día */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {days.map((day) => {
              const d = parseLocalDateKey(day.date);
              const active = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => router.push(`/admin/agenda?date=${day.date}`)}
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
                  <span className="text-lg font-semibold leading-none tabular-nums mt-0.5">
                    {format(d, "d")}
                  </span>
                  {day.totalSlots > 0 && (
                    <div className="mt-1.5 flex w-full justify-center">
                      <div className={cn(
                        "h-1 w-full max-w-[24px] overflow-hidden rounded-full",
                        active ? "bg-primary-foreground/30" : "bg-muted-foreground/20"
                      )}>
                        <div 
                          className={cn(
                            "h-full transition-all duration-300", 
                            active ? "bg-primary-foreground" : "bg-primary"
                          )}
                          style={{ width: `${Math.round(((day.totalSlots - day.availableSlots) / day.totalSlots) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {slots.length === 0 ? (
            <EmptyState title="No hay franjas para este día" />
          ) : (
            <div className="space-y-3">
              {slots.map((slot) => (
                <Card key={slot.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold tabular-nums">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        <Badge variant={slot.remaining <= 0 ? "destructive" : "secondary"}>
                          <Users className="h-3 w-3" />
                          {slot.bookedCount}/{slot.capacity}
                        </Badge>
                        {slot.isBlocked && <Badge variant="warning">Cerrada</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {slot.isBlocked ? "Cerrada" : "Abierta"}
                        </span>
                        <Switch
                          checked={!slot.isBlocked}
                          disabled={isPending}
                          onCheckedChange={() => toggleBlock(slot)}
                          aria-label="Abrir o cerrar la franja"
                        />
                      </div>
                    </div>

                    {slot.attendees.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sin inscriptos.
                      </p>
                    ) : (
                      <ul className="divide-y rounded-lg border">
                        {slot.attendees.map((a) => (
                          <li
                            key={a.bookingId}
                            className="flex items-center justify-between gap-3 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {a.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {a.email}
                                {a.notes ? ` · ${a.notes}` : ""}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setCancelTarget(a)}
                            >
                              <X className="h-4 w-4" />
                              Cancelar
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancelar reserva"
        description={
          cancelTarget
            ? `¿Cancelar la reserva de ${cancelTarget.name}? Se libera el cupo.`
            : ""
        }
        confirmLabel="Cancelar reserva"
        cancelLabel="Volver"
        destructive
        loading={isPending}
        onConfirm={cancelBooking}
      />
    </>
  );
}
