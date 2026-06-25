import type { Metadata } from "next";

import { BookingFlow } from "@/app/(patient)/portal/reservar/booking-flow";
import { PageHeader } from "@/components/shared/page-header";
import { requirePatient } from "@/lib/auth/session";
import { slotService } from "@/server/services/slot.service";
import { serviceService } from "@/server/services/service.service";
import { bookingService } from "@/server/services/booking.service";

export const metadata: Metadata = { title: "Reservar turno" };
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const user = await requirePatient();

  const [days, services, hasRehab] = await Promise.all([
    slotService.getUpcomingDays(),
    serviceService.listActive(),
    bookingService.hasConfirmedRehab(user.id),
  ]);

  // Restricción de horarios SOLO para el primer turno de REHAB (si nunca tuvo
  // uno confirmado). No afecta a ningún otro servicio.
  const esPrimerRehab = !hasRehab;

  // Ya no obtenemos initialSlots por defecto porque dependemos del servicio
  // que seleccione el paciente en el paso 1.

  return (
    <div>
      <PageHeader
        title="Reservar turno"
        description="Elegí el servicio, el día y el horario con cupo."
      />
      <BookingFlow
        services={services}
        days={days}
        initialDate={null}
        initialSlots={[]}
        esPrimerRehab={esPrimerRehab}
      />
    </div>
  );
}
