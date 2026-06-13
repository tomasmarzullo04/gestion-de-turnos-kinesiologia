import { Badge } from "@/components/ui/badge";
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/lib/constants";

const VARIANT: Record<
  AppointmentStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  [APPOINTMENT_STATUS.PENDING]: "warning",
  [APPOINTMENT_STATUS.CONFIRMED]: "default",
  [APPOINTMENT_STATUS.COMPLETED]: "success",
  [APPOINTMENT_STATUS.CANCELLED]: "destructive",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant={VARIANT[status]}>{APPOINTMENT_STATUS_LABELS[status]}</Badge>
  );
}
