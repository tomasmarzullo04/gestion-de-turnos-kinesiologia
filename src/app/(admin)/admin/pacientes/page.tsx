import type { Metadata } from "next";

import { PatientsTable } from "@/app/(admin)/admin/pacientes/patients-table";
import { PageHeader } from "@/components/shared/page-header";
import { patientService } from "@/server/services/patient.service";

export const metadata: Metadata = { title: "Pacientes" };
export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const patients = await patientService.listWithStats();

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description="Pacientes registrados y su historial de turnos."
      />
      <PatientsTable patients={patients} />
    </div>
  );
}
