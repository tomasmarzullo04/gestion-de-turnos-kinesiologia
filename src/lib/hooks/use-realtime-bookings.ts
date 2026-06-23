"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import React from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROLES, type Role } from "@/lib/constants";

export function useRealtimeBookings(role: Role) {
  useEffect(() => {
    // Solo admins reciben notificaciones de nuevas reservas
    if (role !== ROLES.ADMIN) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel("admin-bookings")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          // El payload trae la nueva reserva en `new`.
          // Supabase no hace JOINs por defecto en los payloads de realtime,
          // así que no tenemos el nombre del paciente ni del servicio directo,
          // pero avisamos que hay un nuevo turno.
          toast.success("Nuevo turno reservado", {
            description: "Revisá la agenda para ver los detalles.",
            icon: React.createElement(CalendarClock, { className: "h-4 w-4 text-primary" }),
            duration: 8000,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [role]);
}
