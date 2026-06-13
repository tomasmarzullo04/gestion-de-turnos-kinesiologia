import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CalendarPlus, CalendarX } from "lucide-react";

import {
  AppointmentCard,
  type AppointmentCardData,
} from "@/components/features/appointment-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePatient } from "@/lib/auth/session";
import {
  ACTIVE_STATUSES,
  type AppointmentStatus,
} from "@/lib/constants";
import { appointmentService } from "@/server/services/appointment.service";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const user = await requirePatient();
  const appointments = await appointmentService.listByPatient(user.id, "asc");

  const now = Date.now();
  const upcoming = appointments.filter(
    (a) =>
      a.startsAt.getTime() >= now &&
      ACTIVE_STATUSES.includes(a.status as AppointmentStatus),
  );
  const next = upcoming[0];

  const nextCard: AppointmentCardData | null = next
    ? {
        id: next.id,
        startsAtISO: next.startsAt.toISOString(),
        endsAtISO: next.endsAt.toISOString(),
        status: next.status as AppointmentStatus,
        serviceName: next.service.name,
        professionalName: next.professional.name,
        notes: next.notes,
      }
    : null;

  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader
        title={`Hola, ${firstName} 👋`}
        description="Este es tu portal de turnos."
      >
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
          {nextCard ? (
            <AppointmentCard
              appointment={nextCard}
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link href="/portal/turnos">Ver todos</Link>
                </Button>
              }
            />
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

      {upcoming.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Tenés {upcoming.length} turnos próximos.{" "}
          <Link
            href="/portal/turnos"
            className="font-medium text-primary hover:underline"
          >
            Verlos todos
          </Link>
          .
        </p>
      )}
    </div>
  );
}
