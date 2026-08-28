import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CheckCircle, Clock, LayoutGrid, Users, Loader2 } from "lucide-react";
import { Suspense } from "react";

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

async function AdminCharts({ todayKey }: { todayKey: string }) {
  const [occupancyBySlot, attendanceTrend] = await Promise.all([
    analyticsService.getOccupancyBySlot(todayKey),
    analyticsService.getAttendanceTrend(todayKey, 7),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <OccupancyBarChart data={occupancyBySlot} />
      <AttendanceTrendChart data={attendanceTrend} />
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-[350px] rounded-2xl border border-border/50 bg-card/30 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
      </div>
      <div className="h-[350px] rounded-2xl border border-border/50 bg-card/30 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
      </div>
    </div>
  );
}

async function AdminPeakHours({ todayKey }: { todayKey: string }) {
  const peakHours = await analyticsService.getPeakHours(todayKey, 30);

  return (
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
  );
}

function PeakHoursSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 rounded-2xl border border-border/50 bg-card/30 animate-pulse" />
      ))}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const days = await slotService.getUpcomingDays();
  const todayKey = toLocalDateKey(new Date());

  if (days.length === 0) {
    return (
      <div className="space-y-6 stagger-children">
        <PageHeader title="Dashboard" description="Resumen de la agenda de cupos.">
          <Button asChild>
            <Link href="/admin/asistencias">Asistencias</Link>
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

  const [dailyKPIs, weeklyComparison] = await Promise.all([
    analyticsService.getDailyKPIs(todayKey),
    analyticsService.getWeeklyComparison(todayKey)
  ]);

  const freeSpots = dailyKPIs.totalCapacity - dailyKPIs.totalBooked;

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader title="Dashboard" description="Resumen y métricas del estudio.">
        <Button asChild>
          <Link href="/admin/asistencias">Asistencias</Link>
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

      {/* Gráficos y Métricas Históricas */}
      <Suspense fallback={<ChartsSkeleton />}>
        <AdminCharts todayKey={todayKey} />
      </Suspense>

      <Suspense fallback={<PeakHoursSkeleton />}>
        <AdminPeakHours todayKey={todayKey} />
      </Suspense>
    </div>
  );
}
