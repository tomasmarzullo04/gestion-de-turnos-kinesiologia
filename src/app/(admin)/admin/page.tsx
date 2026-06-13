import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type AppointmentStatus } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/datetime";
import { dashboardService } from "@/server/services/dashboard.service";

export const metadata: Metadata = { title: "Dashboard" };

// Datos siempre frescos para el panel.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [metrics, agenda] = await Promise.all([
    dashboardService.getMetrics(),
    dashboardService.getTodayAgenda(),
  ]);

  const today = new Date();

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader
        title="Dashboard"
        description="Resumen de la actividad de la consultoría."
      >
        <Button asChild>
          <Link href="/admin/turnos">Ver todos los turnos</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Turnos hoy"
          value={metrics.todayCount}
          icon={CalendarDays}
        />
        <StatCard
          label="Pendientes"
          value={metrics.pendingCount}
          icon={CalendarClock}
          hint="A confirmar"
        />
        <StatCard
          label="Próximos"
          value={metrics.upcomingCount}
          icon={CalendarCheck}
          hint="Activos a futuro"
        />
        <StatCard
          label="Completados (7 días)"
          value={metrics.completedThisWeek}
          icon={CheckCircle2}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Agenda de hoy · {formatDate(today)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agenda.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sin turnos para hoy"
              description="No hay turnos agendados para el día de hoy."
            />
          ) : (
            <ul className="divide-y">
              {agenda.map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 shrink-0 text-sm font-semibold tabular-nums">
                      {formatTime(appointment.startsAt)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {appointment.patient.name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {appointment.service.name} ·{" "}
                        {appointment.professional.name}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    status={appointment.status as AppointmentStatus}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
