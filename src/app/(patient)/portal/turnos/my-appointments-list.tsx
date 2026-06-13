"use client";

import * as React from "react";
import { CalendarClock, History, X } from "lucide-react";
import { toast } from "sonner";

import { cancelMyAppointmentAction } from "@/app/(patient)/actions";
import {
  AppointmentCard,
  type AppointmentCardData,
} from "@/components/features/appointment-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APPOINTMENT_STATUS } from "@/lib/constants";

interface Props {
  upcoming: AppointmentCardData[];
  past: AppointmentCardData[];
  cancellationMinHours: number;
}

export function MyAppointmentsList({
  upcoming,
  past,
  cancellationMinHours,
}: Props) {
  const [cancelling, setCancelling] =
    React.useState<AppointmentCardData | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function isCancellable(a: AppointmentCardData): boolean {
    return (
      a.status === APPOINTMENT_STATUS.PENDING ||
      a.status === APPOINTMENT_STATUS.CONFIRMED
    );
  }

  function handleCancel() {
    if (!cancelling) return;
    startTransition(async () => {
      const result = await cancelMyAppointmentAction({ id: cancelling.id });
      if (result.success) {
        toast.success("Turno cancelado");
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
              description="Reservá un turno para verlo acá."
            />
          ) : (
            upcoming.map((a) => (
              <AppointmentCard
                key={a.id}
                appointment={a}
                action={
                  isCancellable(a) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelling(a)}
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                  ) : undefined
                }
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sin turnos en el historial"
              description="Acá vas a ver tus turnos pasados, completados y cancelados."
            />
          ) : (
            past.map((a) => (
              <AppointmentCard key={a.id} appointment={a} muted />
            ))
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancelar turno"
        description={`Podés cancelar con al menos ${cancellationMinHours}h de antelación. ¿Confirmás la cancelación?`}
        confirmLabel="Sí, cancelar"
        cancelLabel="No"
        destructive
        loading={isPending}
        onConfirm={handleCancel}
      />
    </>
  );
}
