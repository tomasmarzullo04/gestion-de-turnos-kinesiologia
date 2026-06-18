import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CalendarDays, LayoutGrid } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { slotService } from "@/server/services/slot.service";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const days = await slotService.getUpcomingDays();
  const totalAvailable = days.reduce((s, d) => s + d.availableSlots, 0);
  const totalSlots = days.reduce((s, d) => s + d.totalSlots, 0);
  const daysWithAvailability = days.filter((d) => d.availableSlots > 0).length;

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader title="Dashboard" description="Resumen de la agenda de cupos.">
        <Button asChild>
          <Link href="/admin/agenda">Ver agenda</Link>
        </Button>
      </PageHeader>

      {days.length === 0 ? (
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Días con disponibilidad"
            value={daysWithAvailability}
            icon={CalendarDays}
          />
          <StatCard
            label="Cupos disponibles"
            value={totalAvailable}
            icon={LayoutGrid}
            hint={`de ${totalSlots} en total`}
          />
          <StatCard
            label="Días en agenda"
            value={days.length}
            icon={CalendarClock}
          />
        </div>
      )}
    </div>
  );
}
