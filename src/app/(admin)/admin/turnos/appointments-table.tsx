"use client";

import * as React from "react";
import {
  Ban,
  CalendarDays,
  Check,
  CheckCheck,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import {
  cancelAppointmentAdminAction,
  updateAppointmentStatusAction,
} from "@/app/(admin)/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPOINTMENT_STATUS, type AppointmentStatus } from "@/lib/constants";
import { formatDateShort, formatTime } from "@/lib/datetime";

export interface AppointmentView {
  id: string;
  startsAtISO: string;
  endsAtISO: string;
  status: AppointmentStatus;
  patientName: string;
  patientEmail: string;
  professionalName: string;
  serviceName: string;
}

export function AppointmentsTable({
  appointments,
}: {
  appointments: AppointmentView[];
}) {
  const [isPending, startTransition] = React.useTransition();
  const [cancelling, setCancelling] = React.useState<AppointmentView | null>(
    null,
  );

  function changeStatus(id: string, status: AppointmentStatus) {
    startTransition(async () => {
      const result = await updateAppointmentStatusAction({ id, status });
      if (result.success) {
        toast.success("Turno actualizado");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCancel() {
    if (!cancelling) return;
    startTransition(async () => {
      const result = await cancelAppointmentAdminAction({ id: cancelling.id });
      if (result.success) {
        toast.success("Turno cancelado");
      } else {
        toast.error(result.error);
      }
      setCancelling(null);
    });
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No hay turnos"
        description="No se encontraron turnos con los filtros aplicados."
      />
    );
  }

  return (
    <>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Profesional</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[1%]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((a) => {
              const isFinal =
                a.status === APPOINTMENT_STATUS.CANCELLED ||
                a.status === APPOINTMENT_STATUS.COMPLETED;
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">
                      {formatDateShort(new Date(a.startsAtISO))}
                    </div>
                    <div className="text-sm tabular-nums text-muted-foreground">
                      {formatTime(new Date(a.startsAtISO))} –{" "}
                      {formatTime(new Date(a.endsAtISO))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{a.patientName}</div>
                    <div className="text-sm text-muted-foreground">
                      {a.patientEmail}
                    </div>
                  </TableCell>
                  <TableCell>{a.serviceName}</TableCell>
                  <TableCell>{a.professionalName}</TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending || isFinal}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {a.status === APPOINTMENT_STATUS.PENDING && (
                          <DropdownMenuItem
                            onSelect={() =>
                              changeStatus(a.id, APPOINTMENT_STATUS.CONFIRMED)
                            }
                          >
                            <Check className="h-4 w-4" />
                            Confirmar
                          </DropdownMenuItem>
                        )}
                        {(a.status === APPOINTMENT_STATUS.PENDING ||
                          a.status === APPOINTMENT_STATUS.CONFIRMED) && (
                          <DropdownMenuItem
                            onSelect={() =>
                              changeStatus(a.id, APPOINTMENT_STATUS.COMPLETED)
                            }
                          >
                            <CheckCheck className="h-4 w-4" />
                            Marcar completado
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setCancelling(a)}
                        >
                          <Ban className="h-4 w-4" />
                          Cancelar turno
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancelar turno"
        description={
          cancelling
            ? `¿Cancelar el turno de ${cancelling.patientName} del ${formatDateShort(new Date(cancelling.startsAtISO))}?`
            : ""
        }
        confirmLabel="Cancelar turno"
        cancelLabel="Volver"
        destructive
        loading={isPending}
        onConfirm={handleCancel}
      />
    </>
  );
}
