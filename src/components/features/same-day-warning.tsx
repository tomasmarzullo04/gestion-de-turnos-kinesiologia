"use client";

import { AlertTriangle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type SameDayBooking } from "@/server/services/booking.service";

interface Props {
  title: string;
  bookings: SameDayBooking[];
  onCancel: (bookingId: string) => void;
  cancelling?: boolean;
}

/** Alerta (no bloqueante) de que el paciente ya tiene turno ese día. */
export function SameDayWarning({ title, bookings, onCancel, cancelling }: Props) {
  if (bookings.length === 0) return null;
  return (
    <div
      role="alert"
      className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800/60 dark:bg-amber-950/30"
    >
      <p className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {title}
      </p>
      <ul className="space-y-1.5">
        {bookings.map((b) => (
          <li key={b.bookingId} className="flex items-center justify-between gap-2">
            <span className="tabular-nums text-amber-800 dark:text-amber-300">
              {b.startTime}–{b.endTime} h{b.serviceName ? ` · ${b.serviceName}` : ""}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cancelling}
              className="h-7 border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
              onClick={() => onCancel(b.bookingId)}
            >
              <X className="h-3.5 w-3.5" />
              Cancelar ese turno
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-amber-700 dark:text-amber-400">
        Si es a propósito (dos turnos el mismo día), podés continuar igual.
      </p>
    </div>
  );
}
