import type { Metadata } from "next";

import { PatientsTable } from "@/app/(admin)/admin/pacientes/patients-table";
import { PageHeader } from "@/components/shared/page-header";
import { toLocalDateKey } from "@/lib/datetime";
import { patientService } from "@/server/services/patient.service";
import { paymentService } from "@/server/services/payment.service";

export const metadata: Metadata = { title: "Pacientes" };
export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = viewParam === "archived" ? "archived" : "active";

  const [list, copagoAmount] = await Promise.all([
    patientService.listWithStats(view === "archived"),
    paymentService.getCopagoAmount(),
  ]);

  // En "archivados" mostramos solo los archivados; en "activos", listWithStats
  // ya excluye los archivados.
  const patients = view === "archived" ? list.filter((p) => p.archived) : list;

  const todayKey = toLocalDateKey(new Date());

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description="Pacientes registrados, su historial de turnos y la deuda de copagos."
      />
      <PatientsTable
        patients={patients}
        copagoAmount={copagoAmount}
        todayKey={todayKey}
        view={view}
      />
    </div>
  );
}
