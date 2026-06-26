import type { Metadata } from "next";

import { PatientsTable } from "@/app/(admin)/admin/pacientes/patients-table";
import { PageHeader } from "@/components/shared/page-header";
import { toLocalDateKey } from "@/lib/datetime";
import { patientService } from "@/server/services/patient.service";
import { paymentService } from "@/server/services/payment.service";

export const metadata: Metadata = { title: "Pacientes" };
export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const [patients, copagoAmount] = await Promise.all([
    patientService.listWithStats(),
    paymentService.getCopagoAmount(),
  ]);

  const todayKey = toLocalDateKey(new Date());
  const [yStr, mStr] = todayKey.split("-");
  const period = { month: Number(mStr), year: Number(yStr) };

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description="Pacientes registrados, su historial de turnos y el copago del mes."
      />
      <PatientsTable
        patients={patients}
        copagoAmount={copagoAmount}
        period={period}
        todayKey={todayKey}
      />
    </div>
  );
}
