import type { Metadata } from "next";
import { addMinutes } from "date-fns";

import { PageHeader } from "@/components/shared/page-header";
import { AppointmentsFilters } from "@/app/(admin)/admin/turnos/appointments-filters";
import {
  AppointmentsTable,
  type AppointmentView,
} from "@/app/(admin)/admin/turnos/appointments-table";
import { CreateAppointmentDialog } from "@/app/(admin)/admin/turnos/create-appointment-dialog";
import {
  APPOINTMENT_STATUS_VALUES,
  type AppointmentStatus,
} from "@/lib/constants";
import { combineDateAndTime, parseLocalDateKey } from "@/lib/datetime";
import { type AppointmentFilters } from "@/server/repositories/appointment.repository";
import { appointmentService } from "@/server/services/appointment.service";
import { professionalService } from "@/server/services/professional.service";
import { serviceService } from "@/server/services/service.service";
import { userRepository } from "@/server/repositories/user.repository";

export const metadata: Metadata = { title: "Turnos" };
export const dynamic = "force-dynamic";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function dayBoundary(value: string | undefined, edge: "start" | "end") {
  if (!value || !DATE_KEY.test(value)) return undefined;
  const day = parseLocalDateKey(value);
  const start = combineDateAndTime(day, "00:00");
  return edge === "start" ? start : addMinutes(start, 24 * 60);
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    professionalId?: string;
    status?: string;
    from?: string;
    to?: string;
    patient?: string;
  }>;
}) {
  const params = await searchParams;

  const status =
    params.status &&
    APPOINTMENT_STATUS_VALUES.includes(params.status as AppointmentStatus)
      ? (params.status as AppointmentStatus)
      : undefined;

  const filters: AppointmentFilters = {
    professionalId: params.professionalId || undefined,
    status,
    from: dayBoundary(params.from, "start"),
    to: dayBoundary(params.to, "end"),
  };

  const [appointments, professionals, patients, services] = await Promise.all([
    appointmentService.list(filters, "desc"),
    professionalService.list(),
    userRepository.listPatients(),
    serviceService.listActive(),
  ]);

  // Búsqueda por paciente (nombre o email) en memoria.
  const search = params.patient?.trim().toLowerCase();
  const filtered = search
    ? appointments.filter(
        (a) =>
          a.patient.name.toLowerCase().includes(search) ||
          a.patient.email.toLowerCase().includes(search),
      )
    : appointments;

  const views: AppointmentView[] = filtered.map((a) => ({
    id: a.id,
    startsAtISO: a.startsAt.toISOString(),
    endsAtISO: a.endsAt.toISOString(),
    status: a.status as AppointmentStatus,
    patientName: a.patient.name,
    patientEmail: a.patient.email,
    professionalName: a.professional.name,
    serviceName: a.service.name,
  }));

  return (
    <div>
      <PageHeader title="Turnos" description="Gestión completa de la agenda.">
        <CreateAppointmentDialog
          patients={patients.map((p) => ({ id: p.id, name: p.name }))}
          professionals={professionals
            .filter((p) => p.active)
            .map((p) => ({ id: p.id, name: p.name }))}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMinutes: s.durationMinutes,
          }))}
        />
      </PageHeader>

      <AppointmentsFilters
        professionals={professionals.map((p) => ({ id: p.id, name: p.name }))}
      />

      <AppointmentsTable appointments={views} />
    </div>
  );
}
