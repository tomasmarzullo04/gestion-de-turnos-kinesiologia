import type { Metadata } from "next";

import { MyBookingsList } from "@/app/(patient)/portal/turnos/my-bookings-list";
import { PageHeader } from "@/components/shared/page-header";
import { requirePatient } from "@/lib/auth/session";
import { CANCELLATION_MIN_HOURS } from "@/lib/constants";
import { bookingService } from "@/server/services/booking.service";

export const metadata: Metadata = { title: "Mis turnos" };
export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const user = await requirePatient();
  const bookings = await bookingService.listForUser(user.id);

  const now = Date.now();
  const upcoming = bookings.filter(
    (b) =>
      b.status === "CONFIRMED" && new Date(b.startsAtISO).getTime() >= now,
  );
  const past = bookings.filter(
    (b) =>
      !(b.status === "CONFIRMED" && new Date(b.startsAtISO).getTime() >= now),
  );
  // upcoming viene DESC por la query; lo invertimos para mostrar el más próximo primero.
  upcoming.reverse();

  return (
    <div>
      <PageHeader
        title="Mis turnos"
        description="Tus próximos turnos y tu historial."
      />
      <MyBookingsList
        upcoming={upcoming}
        past={past}
        cancellationMinHours={CANCELLATION_MIN_HOURS}
      />
    </div>
  );
}
