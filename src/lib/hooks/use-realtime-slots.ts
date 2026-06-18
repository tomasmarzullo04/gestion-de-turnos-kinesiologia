"use client";

import * as React from "react";

import { BOOKING_CONFIG } from "@/lib/booking-config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { type SlotView } from "@/server/services/slot.service";

interface SlotRow {
  id: string;
  capacity: number;
  booked_count: number;
  is_blocked: boolean;
}

/**
 * Suscribe (solo lectura) a los cambios de `slots` del día indicado y actualiza
 * en vivo los cupos/estado de cada franja. Si Supabase Realtime no está
 * configurado, no hace nada (la app funciona igual con refresco normal).
 */
export function useRealtimeSlots(
  date: string | null,
  setSlots: React.Dispatch<React.SetStateAction<SlotView[]>>,
): void {
  React.useEffect(() => {
    if (!date) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`slots:${date}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "slots",
          filter: `date=eq.${date}`,
        },
        (payload) => {
          const row = payload.new as SlotRow;
          setSlots((prev) =>
            prev.map((s) => {
              if (s.id !== row.id) return s;
              const remaining = row.capacity - row.booked_count;
              const available = !row.is_blocked && remaining > 0 && !s.isPast;
              return {
                ...s,
                capacity: row.capacity,
                bookedCount: row.booked_count,
                isBlocked: row.is_blocked,
                remaining,
                available,
                lowSlots:
                  available && remaining <= BOOKING_CONFIG.lowSlotsThreshold,
              };
            }),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [date, setSlots]);
}
