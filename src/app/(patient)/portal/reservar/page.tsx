import type { Metadata } from "next";

import { BookingFlow } from "@/app/(patient)/portal/reservar/booking-flow";
import { PageHeader } from "@/components/shared/page-header";
import { requirePatient } from "@/lib/auth/session";
import { slotService } from "@/server/services/slot.service";

export const metadata: Metadata = { title: "Reservar turno" };
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  await requirePatient();

  const days = await slotService.getUpcomingDays();
  const firstAvailable = days.find((d) => d.availableSlots > 0) ?? days[0];
  const initialDate = firstAvailable?.date ?? null;
  const initialSlots = initialDate
    ? await slotService.getSlotsForDate(initialDate)
    : [];

  return (
    <div>
      <PageHeader
        title="Reservar turno"
        description="Elegí un día y un horario disponible."
      />
      <BookingFlow
        days={days}
        initialDate={initialDate}
        initialSlots={initialSlots}
      />
    </div>
  );
}
