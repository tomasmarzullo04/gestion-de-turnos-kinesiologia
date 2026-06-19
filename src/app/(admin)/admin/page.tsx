import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CheckCircle, Clock, LayoutGrid, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { slotService } from "@/server/services/slot.service";
import { analyticsService } from "@/server/services/analytics.service";
import { toLocalDateKey } from "@/lib/datetime";
import { OccupancyBarChart } from "@/components/admin/charts/occupancy-bar-chart";
import { AttendanceTrendChart } from "@/components/admin/charts/attendance-trend-chart";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const days = await slotService.getUpcomingDays();
  const todayKey = toLocalDateKey(new Date());

  if (days.length === 0) {
    return (
      <div className="space-y-6 stagger-children">
        <PageHeader title="Dashboard" description="Resumen de la agenda de cupos.">
          <Button asChild>
            <Link href="/admin/agenda">Ver agenda</Link>
          </Button>
        </PageHeader>
        <EmptyState
          icon={CalendarClock}
          title="Todavía no hay franjas"
          description="Configurá las plantillas y generá la agenda para empezar a recibir reservas."
          action={
            <Button asChild>
              <Link href="/admin/plantillas">Configurar plantillas</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const [
    dailyKPIs,
    occupancyBySlot,
    attendanceTrend,
    peakHours,
    weeklyComparison
  ] = await Promise.all([
    analyticsService.getDailyKPIs(todayKey),
    analyticsService.getOccupancyBySlot(todayKey),
    analyticsService.getAttendanceTrend(todayKey, 7),
    analyticsService.getPeakHours(todayKey, 30),
    analyticsService.getWeeklyComparison(todayKey)
  ]);

  const freeSpots = dailyKPIs.totalCapacity - dailyKPIs.totalBooked;

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader title="Dashboard" description="Resumen y métricas del estudio.">
        <Button asChild>
          <Link href="/admin/agenda">Ver agenda</Link>
        </Button>
      </PageHeader>

      {/* KPIs Principales de Hoy */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Turnos Reservados (Hoy)"
          value={dailyKPIs.totalBooked}
          icon={Users}
          hint={
            weeklyComparison.bookedDiff > 0 
              ? `+${weeklyComparison.bookedDiff} vs sem. anterior` 
              : `${weeklyComparison.bookedDiff} vs sem. anterior`
          }
        />
        <StatCard
          label="Cupos Libres (Hoy)"
          value={freeSpots}
          icon={LayoutGrid}
          hint={`de ${dailyKPIs.totalCapacity} en total`}
        />
        <StatCard
          label="Ocupación (Hoy)"
          value={`${Math.round(dailyKPIs.occupancyRate)}%`}
          icon={CalendarClock}
          hint="Capacidad ocupada"
        />
        <StatCard
          label="Asistencia (Hoy)"
          value={`${Math.round(dailyKPIs.attendanceRate)}%`}
          icon={CheckCircle}
          hint={`${dailyKPIs.present} presentes / ${dailyKPIs.expected} esperados`}
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <OccupancyBarChart data={occupancyBySlot} />
        <AttendanceTrendChart data={attendanceTrend} />
      </div>

      {/* Horarios Pico */}
      <div className="grid gap-4 sm:grid-cols-3">
        {peakHours.map((ph, i) => (
          <StatCard
            key={ph.time}
            label={i === 0 ? "Horario más demandado" : `Horario pico #${i + 1}`}
            value={ph.time}
            icon={Clock}
            hint={`${Math.round(ph.avgOccupancy)}% ocupación prom. (30 días)`}
          />
        ))}
      </div>
    </div>
  );
}
