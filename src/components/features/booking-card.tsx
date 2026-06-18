import { CalendarDays, Clock } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { type BookingStatus } from "@/lib/booking-config";
import { formatDate, parseLocalDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { type MyBooking } from "@/server/services/booking.service";

interface BookingCardProps {
  booking: MyBooking;
  action?: React.ReactNode;
  muted?: boolean;
}

export function BookingCard({ booking, action, muted = false }: BookingCardProps) {
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
            <span className="flex items-center gap-1.5 font-semibold capitalize">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {formatDate(parseLocalDateKey(booking.date))}
            </span>
            <StatusBadge status={booking.status as BookingStatus} />
          </div>
          <p className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
            <Clock className="h-4 w-4" />
            {booking.startTime} – {booking.endTime} h
          </p>
          {booking.notes && (
            <p className="text-sm text-muted-foreground">Nota: {booking.notes}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardContent>
    </Card>
  );
}
