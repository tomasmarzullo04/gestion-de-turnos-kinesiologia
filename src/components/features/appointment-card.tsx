import { CalendarDays, Clock, Stethoscope } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { type AppointmentStatus } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export interface AppointmentCardData {
  id: string;
  startsAtISO: string;
  endsAtISO: string;
  status: AppointmentStatus;
  serviceName: string;
  professionalName: string;
  notes?: string | null;
}

interface AppointmentCardProps {
  appointment: AppointmentCardData;
  /** Acciones (ej. botón cancelar) renderizadas al pie. */
  action?: React.ReactNode;
  muted?: boolean;
}

export function AppointmentCard({
  appointment,
  action,
  muted = false,
}: AppointmentCardProps) {
  const start = new Date(appointment.startsAtISO);
  const end = new Date(appointment.endsAtISO);

  return (
    <Card
      className={cn(
        "transition-all duration-200 ease-out-soft",
        muted
          ? "opacity-70"
          : "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-e2",
      )}
    >
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{appointment.serviceName}</span>
            <StatusBadge status={appointment.status} />
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-4">
            <span className="flex items-center gap-1.5 capitalize">
              <CalendarDays className="h-4 w-4" />
              {formatDate(start)}
            </span>
            <span className="flex items-center gap-1.5 tabular-nums">
              <Clock className="h-4 w-4" />
              {formatTime(start)} – {formatTime(end)}
            </span>
            <span className="flex items-center gap-1.5">
              <Stethoscope className="h-4 w-4" />
              {appointment.professionalName}
            </span>
          </div>
          {appointment.notes && (
            <p className="text-sm text-muted-foreground">
              Nota: {appointment.notes}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardContent>
    </Card>
  );
}
