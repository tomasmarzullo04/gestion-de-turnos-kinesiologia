import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { BookingFlow } from "@/app/(patient)/portal/reservar/booking-flow";
import { professionalService } from "@/server/services/professional.service";
import { serviceService } from "@/server/services/service.service";
import { CalendarOff } from "lucide-react";

export const metadata: Metadata = { title: "Reservar turno" };
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [professionals, services] = await Promise.all([
    professionalService.listActive(),
    serviceService.listActive(),
  ]);

  const canBook = professionals.length > 0 && services.length > 0;

  return (
    <div>
      <PageHeader
        title="Reservar turno"
        description="Elegí profesional, servicio y un horario disponible."
      />
      {canBook ? (
        <BookingFlow
          professionals={professionals.map((p) => ({
            id: p.id,
            name: p.name,
            specialty: p.specialty,
          }))}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMinutes: s.durationMinutes,
            description: s.description,
          }))}
        />
      ) : (
        <EmptyState
          icon={CalendarOff}
          title="Reservas no disponibles"
          description="Por el momento no hay profesionales o servicios activos. Volvé a intentar más tarde."
        />
      )}
    </div>
  );
}
