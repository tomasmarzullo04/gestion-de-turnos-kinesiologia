"use client";

import * as React from "react";
import { CalendarDays, Clock, Loader2, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import {
  adminCancelBookingAction,
  adminCancelSeriesAction,
} from "@/app/(admin)/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, parseLocalDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export interface CancelTarget {
  bookingId: string;
  recurrenceId: string | null;
  patientName: string;
  serviceName: string | null;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
}

/**
 * Elimina (cancela — soft) un turno del profesional. Confirma con paciente,
 * servicio, fecha y hora. Si el turno es parte de una serie, deja elegir entre
 * "solo esta fecha" o "toda la serie (turnos futuros)". Libera el cupo por el
 * mismo camino atómico (cancel_booking).
 */
export function CancelTurnoDialog({
  target,
  open,
  onOpenChange,
  onDone,
}: {
  target: CancelTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [scope, setScope] = React.useState<"one" | "series">("one");
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) setScope("one");
  }, [open]);

  const isSeries = Boolean(target?.recurrenceId);

  function handleConfirm() {
    if (!target) return;
    startTransition(async () => {
      const result =
        isSeries && scope === "series"
          ? await adminCancelSeriesAction({ recurrenceId: target.recurrenceId })
          : await adminCancelBookingAction({ bookingId: target.bookingId });
      if (result.success) {
        toast.success(
          isSeries && scope === "series"
            ? "Serie cancelada. Se liberaron los cupos futuros."
            : "Turno eliminado. Se liberó el cupo.",
        );
        onOpenChange(false);
        onDone();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Eliminar turno
          </DialogTitle>
          <DialogDescription>
            El turno se cancela y se libera el cupo. Queda en el historial como cancelado.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{target.patientName}</span>
              {target.serviceName && (
                <span className="text-muted-foreground">· {target.serviceName}</span>
              )}
            </p>
            <p className="flex items-center gap-2 capitalize">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {formatDate(parseLocalDateKey(target.date))}
            </p>
            <p className="flex items-center gap-2 tabular-nums">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {target.startTime} – {target.endTime} h
            </p>
          </div>
        )}

        {isSeries && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Este turno es parte de una serie (turno fijo).</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setScope("one")}
                aria-pressed={scope === "one"}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  scope === "one" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                )}
              >
                <span className="font-medium">Solo esta fecha</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Se cancela únicamente este turno.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setScope("series")}
                aria-pressed={scope === "series"}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  scope === "series" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                )}
              >
                <span className="font-medium">Toda la serie</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Cancela todos los turnos futuros de la serie.
                </span>
              </button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Volver
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSeries && scope === "series" ? "Cancelar serie" : "Eliminar turno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
