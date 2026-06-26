import type { Metadata } from "next";

import { ReservarTabs } from "@/app/(patient)/portal/reservar/reservar-tabs";
import { PageHeader } from "@/components/shared/page-header";
import { requirePatient } from "@/lib/auth/session";
import { toLocalDateKey } from "@/lib/datetime";
import { slotService } from "@/server/services/slot.service";
import { serviceService } from "@/server/services/service.service";
import { bookingService } from "@/server/services/booking.service";

export const metadata: Metadata = { title: "Reservar turno" };
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const user = await requirePatient();

  const [days, services, rehabLibre] = await Promise.all([
    slotService.getUpcomingDays(),
    serviceService.listActive(),
    bookingService.puedeReservarRehabLibre(user.id),
  ]);

  // La restricción de horarios de REHAB se mantiene hasta que el paciente
  // asistió a una sesión (asistencia PRESENT). No afecta a otros servicios.
  const esPrimerRehab = !rehabLibre;

  // Fecha de hoy y último día del mes (default para el "turno fijo").
  const todayKey = toLocalDateKey(new Date());
  const [y, m] = todayKey.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const defaultToDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return (
    <div>
      <PageHeader
        title="Reservar turno"
        description="Reservá un turno único o un turno fijo recurrente."
      />
      <ReservarTabs
        services={services}
        days={days}
        esPrimerRehab={esPrimerRehab}
        todayKey={todayKey}
        defaultToDate={defaultToDate}
      />
    </div>
  );
}
