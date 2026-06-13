import { Badge } from "@/components/ui/badge";
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/lib/constants";

const VARIANT: Record<
  AppointmentStatus,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  [APPOINTMENT_STATUS.PENDING]: "warning",
  [APPOINTMENT_STATUS.CONFIRMED]: "default",
  [APPOINTMENT_STATUS.COMPLETED]: "outline",
  [APPOINTMENT_STATUS.CANCELLED]: "destructive",
};

// Color del punto indicador por estado (semántico).
const DOT: Record<AppointmentStatus, string> = {
  [APPOINTMENT_STATUS.PENDING]: "bg-warning",
  [APPOINTMENT_STATUS.CONFIRMED]: "bg-primary",
  [APPOINTMENT_STATUS.COMPLETED]: "bg-muted-foreground",
  [APPOINTMENT_STATUS.CANCELLED]: "bg-destructive",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant={VARIANT[status]}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      {APPOINTMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
