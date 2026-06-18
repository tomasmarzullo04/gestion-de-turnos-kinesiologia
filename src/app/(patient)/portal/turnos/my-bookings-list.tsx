"use client";

import * as React from "react";
import { CalendarClock, History, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { cancelBookingAction } from "@/app/(patient)/actions";
import { BookingCard } from "@/components/features/booking-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type MyBooking } from "@/server/services/booking.service";

interface Props {
  upcoming: MyBooking[];
  past: MyBooking[];
  cancellationMinHours: number;
}

export function MyBookingsList({ upcoming, past, cancellationMinHours }: Props) {
  const [cancelling, setCancelling] = React.useState<MyBooking | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleCancel() {
    if (!cancelling) return;
    startTransition(async () => {
      const result = await cancelBookingAction({ bookingId: cancelling.id });
      if (result.success) {
        toast.success("Turno cancelado. Liberaste el cupo.");
      } else {
        toast.error(result.error);
      }
      setCancelling(null);
    });
  }

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
                  <Link href="/portal/reservar">
                    Reservar turno
                  </Link>
                </Button>
              }
            />
          ) : (
            upcoming.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelling(booking)}
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                }
              />
            ))
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
    </>
  );
}
