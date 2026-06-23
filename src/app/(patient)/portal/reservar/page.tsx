import type { Metadata } from "next";

import { BookingFlow } from "@/app/(patient)/portal/reservar/booking-flow";
import { PageHeader } from "@/components/shared/page-header";
import { requirePatient } from "@/lib/auth/session";
import { slotService } from "@/server/services/slot.service";
import { serviceService } from "@/server/services/service.service";
import { patientService } from "@/server/services/patient.service";

export const metadata: Metadata = { title: "Reservar turno" };
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const user = await requirePatient();

  const [days, services, profile] = await Promise.all([
    slotService.getUpcomingDays(),
    serviceService.listActive(),
    patientService.getPatientProfile(user.id),
  ]);

  const esPrimeraVez = profile?.esPrimeraVez ?? false;

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
        esPrimeraVez={esPrimeraVez}
      />
    </div>
  );
}
