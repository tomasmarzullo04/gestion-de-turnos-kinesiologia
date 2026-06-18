import { Badge } from "@/components/ui/badge";
import {
  BOOKING_STATUS,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@/lib/booking-config";

const VARIANT: Record<
  BookingStatus,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  [BOOKING_STATUS.CONFIRMED]: "success",
  [BOOKING_STATUS.CANCELLED]: "destructive",
};

const DOT: Record<BookingStatus, string> = {
  [BOOKING_STATUS.CONFIRMED]: "bg-success",
  [BOOKING_STATUS.CANCELLED]: "bg-destructive",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  // Estados desconocidos (p. ej. históricos) caen en un look neutro.
  const variant = VARIANT[status] ?? "outline";
  const dot = DOT[status] ?? "bg-muted-foreground";
  const label = BOOKING_STATUS_LABELS[status] ?? status;

  return (
    <Badge variant={variant}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </Badge>
  );
}
