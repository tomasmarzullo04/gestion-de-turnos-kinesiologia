import type { Metadata } from "next";

import { type AppointmentCardData } from "@/components/features/appointment-card";
import { PageHeader } from "@/components/shared/page-header";
import { MyAppointmentsList } from "@/app/(patient)/portal/turnos/my-appointments-list";
import { requirePatient } from "@/lib/auth/session";
import {
  ACTIVE_STATUSES,
  CANCELLATION_MIN_HOURS,
  type AppointmentStatus,
} from "@/lib/constants";
import { appointmentService } from "@/server/services/appointment.service";

export const metadata: Metadata = { title: "Mis turnos" };
export const dynamic = "force-dynamic";

export default async function MyAppointmentsPage() {
  const user = await requirePatient();
  const appointments = await appointmentService.listByPatient(user.id, "asc");

  const now = Date.now();

  const toCard = (a: (typeof appointments)[number]): AppointmentCardData => ({
    id: a.id,
    startsAtISO: a.startsAt.toISOString(),
    endsAtISO: a.endsAt.toISOString(),
    status: a.status as AppointmentStatus,
    serviceName: a.service.name,
    professionalName: a.professional.name,
    notes: a.notes,
  });

  // "Próximos" = activos a futuro. El resto va al historial (desc).
  const upcoming = appointments
    .filter(
      (a) =>
        a.startsAt.getTime() >= now &&
        ACTIVE_STATUSES.includes(a.status as AppointmentStatus),
    )
    .map(toCard);

  const past = appointments
    .filter(
      (a) =>
        !(
          a.startsAt.getTime() >= now &&
          ACTIVE_STATUSES.includes(a.status as AppointmentStatus)
        ),
    )
    .map(toCard)
    .reverse();

  return (
    <div>
      <PageHeader
        title="Mis turnos"
        description="Consultá tus próximos turnos y tu historial."
      />
      <MyAppointmentsList
        upcoming={upcoming}
        past={past}
        cancellationMinHours={CANCELLATION_MIN_HOURS}
      />
    </div>
  );
}
