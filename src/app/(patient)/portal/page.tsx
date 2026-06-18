import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CalendarPlus, CalendarX, Clock } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type BookingStatus } from "@/lib/booking-config";
import { requirePatient } from "@/lib/auth/session";
import { formatDate } from "@/lib/datetime";
import { parseLocalDateKey } from "@/lib/datetime";
import { bookingService } from "@/server/services/booking.service";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const user = await requirePatient();
  const bookings = await bookingService.listForUser(user.id);

  const now = Date.now();
  const next = bookings.find(
    (b) =>
      b.status === "CONFIRMED" &&
      new Date(b.startsAtISO).getTime() >= now,
  );

  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader title={`Hola, ${firstName} 👋`} description="Tu portal de turnos.">
        <Button asChild>
          <Link href="/portal/reservar">
            <CalendarPlus className="h-4 w-4" />
            Reservar turno
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Tu próximo turno
          </CardTitle>
        </CardHeader>
        <CardContent>
          {next ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold capitalize">
                    {formatDate(parseLocalDateKey(next.date))}
                  </span>
                  <StatusBadge status={next.status as BookingStatus} />
                </div>
                <p className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {next.startTime} – {next.endTime} h
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/turnos">Ver todos</Link>
              </Button>
            </div>
          ) : (
            <EmptyState
              icon={CalendarX}
              title="No tenés turnos próximos"
              description="Reservá tu próxima sesión en unos pocos clics."
              action={
                <Button asChild>
                  <Link href="/portal/reservar">
                    <CalendarPlus className="h-4 w-4" />
                    Reservar turno
                  </Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
