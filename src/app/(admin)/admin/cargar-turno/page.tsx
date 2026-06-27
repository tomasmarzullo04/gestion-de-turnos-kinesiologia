import type { Metadata } from "next";

import { CargarTurnoForm } from "@/app/(admin)/admin/cargar-turno/cargar-turno-form";
import { PageHeader } from "@/components/shared/page-header";
import { toLocalDateKey } from "@/lib/datetime";
import { patientService } from "@/server/services/patient.service";
import { serviceService } from "@/server/services/service.service";

export const metadata: Metadata = { title: "Cargar turno" };
export const dynamic = "force-dynamic";

export default async function CargarTurnoPage() {
  const [patients, services] = await Promise.all([
    patientService.listBasic(),
    serviceService.listActive(),
  ]);

  return (
    <div>
      <PageHeader
        title="Cargar turno"
        description="Asigná un turno a un paciente. Si la franja está llena, podés cargarlo como excepción (sobrecupo)."
      />
      <CargarTurnoForm
        patients={patients}
        services={services.map((s) => ({ id: s.id, name: s.name }))}
        todayKey={toLocalDateKey(new Date())}
      />
    </div>
  );
}
