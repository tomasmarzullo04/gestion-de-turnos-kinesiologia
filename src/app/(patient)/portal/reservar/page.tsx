import type { Metadata } from "next";

import { ReservarTabs } from "@/app/(patient)/portal/reservar/reservar-tabs";
import { PageHeader } from "@/components/shared/page-header";
import { requirePatient } from "@/lib/auth/session";
import { toLocalDateKey } from "@/lib/datetime";
import { slotService } from "@/server/services/slot.service";
import { serviceService } from "@/server/services/service.service";
import { slotTemplateService } from "@/server/services/slot-template.service";
import { generationService } from "@/server/services/generation.service";
import { bookingService } from "@/server/services/booking.service";
import { patientService } from "@/server/services/patient.service";

export const metadata: Metadata = { title: "Reservar turno" };
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const user = await requirePatient();

  // Red de seguridad: si el horizonte de agenda quedó corto, se rellena antes de
  // listar los días (barato salvo cuando falta agenda). El mecanismo principal es
  // el cron diario (vercel.json → /api/cron/materialize).
  try {
    await generationService.ensureWindow();
  } catch {
    // Nunca bloquear la reserva por el mantenimiento de la ventana.
  }

  const [days, services, rehabLibre, schedules, profile] = await Promise.all([
    slotService.getUpcomingDays(),
    serviceService.listActive(),
    bookingService.puedeReservarRehabLibre(user.id),
    slotTemplateService.activeScheduleByService(),
    patientService.getPatientProfile(user.id),
  ]);

  // La restricción de horarios de REHAB se mantiene hasta que el paciente
  // asistió a una sesión (asistencia PRESENT). No afecta a otros servicios.
  const esPrimerRehab = !rehabLibre;
  const esPrimeraVez = profile?.esPrimeraVez ?? false;

  // Fecha de hoy y último día del mes (default para el "turno fijo").
  const todayKey = toLocalDateKey(new Date());
  const [yStr, mStr] = todayKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
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
        esPrimeraVez={esPrimeraVez}
        todayKey={todayKey}
        defaultToDate={defaultToDate}
        schedules={schedules}
      />
    </div>
  );
}
