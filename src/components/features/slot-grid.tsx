"use client";

import { Ban, Check, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { type SlotView } from "@/server/services/slot.service";

interface SlotGridProps {
  slots: SlotView[];
  selectedId?: string | null;
  onSelect?: (slot: SlotView) => void;
}

function capacityLabel(slot: SlotView): string {
  if (slot.isBlocked) return "Cerrada";
  if (slot.isPast) return "Finalizada";
  if (slot.remaining <= 0) return "Sin cupos";
  return `${slot.remaining} de ${slot.capacity}`;
}

export function SlotGrid({ slots, selectedId, onSelect }: SlotGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {slots.map((slot, index) => {
        const selected = selectedId === slot.id;
        const filledPct = Math.min(
          100,
          Math.round((slot.bookedCount / Math.max(slot.capacity, 1)) * 100),
        );

        return (
          <button
            key={slot.id}
            type="button"
            disabled={!slot.available}
            onClick={() => slot.available && onSelect?.(slot)}
            aria-pressed={selected}
            style={{ animationDelay: `${Math.min(index * 25, 400)}ms` }}
            className={cn(
              "group animate-slot-pop flex flex-col gap-2 rounded-lg border p-3 text-left shadow-e1 transition-all duration-150 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              slot.available &&
                !selected &&
                "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-e2",
              slot.available && "active:scale-[0.98]",
              selected && "border-primary bg-primary text-primary-foreground shadow-e2",
              !slot.available && "cursor-not-allowed border-dashed opacity-60",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm font-semibold tabular-nums">
                <Clock
                  className={cn(
                    "h-3.5 w-3.5",
                    selected ? "opacity-90" : "text-muted-foreground",
                  )}
                />
                {slot.startTime}
              </span>
              {selected && <Check className="h-4 w-4" />}
              {!slot.available && !selected && (
                <Ban className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>

            <div
              className={cn(
                "text-xs font-medium tabular-nums",
                selected
                  ? "text-primary-foreground/90"
                  : slot.isBlocked || slot.isPast || slot.remaining <= 0
                    ? "text-muted-foreground"
                    : slot.lowSlots
                      ? "text-warning-foreground dark:text-warning"
                      : "text-muted-foreground",
              )}
            >
              {capacityLabel(slot)}
              {slot.available && slot.lowSlots && " · ¡últimos!"}
            </div>

            {/* Barra sutil de ocupación (se anima al cambiar los cupos). */}
            {!slot.isBlocked && !slot.isPast && (
              <div
                className={cn(
                  "h-1 overflow-hidden rounded-full",
                  selected ? "bg-primary-foreground/25" : "bg-muted",
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out-soft",
                    selected
                      ? "bg-primary-foreground"
                      : slot.remaining <= 0
                        ? "bg-muted-foreground/40"
                        : slot.lowSlots
                          ? "bg-warning"
                          : "bg-primary",
                  )}
                  style={{ width: `${filledPct}%` }}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
