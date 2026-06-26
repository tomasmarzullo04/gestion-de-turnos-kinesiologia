import type { Metadata } from "next";

import { FinanzasView } from "@/app/(admin)/admin/finanzas/finanzas-view";
import { PageHeader } from "@/components/shared/page-header";
import { toLocalDateKey } from "@/lib/datetime";
import { patientService } from "@/server/services/patient.service";
import { paymentService } from "@/server/services/payment.service";

export const metadata: Metadata = { title: "Finanzas" };
export const dynamic = "force-dynamic";

function clampMonth(value: number, fallback: number): number {
  return Number.isInteger(value) && value >= 1 && value <= 12 ? value : fallback;
}
function clampYear(value: number, fallback: number): number {
  return Number.isInteger(value) && value >= 2000 && value <= 2100
    ? value
    : fallback;
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; y?: string }>;
}) {
  const sp = await searchParams;
  const todayKey = toLocalDateKey(new Date());
  const [yStr, mStr] = todayKey.split("-");
  const month = clampMonth(Number(sp.m), Number(mStr));
  const year = clampYear(Number(sp.y), Number(yStr));

  const [summary, copagoAmount, patients] = await Promise.all([
    paymentService.getMonthlySummary(month, year),
    paymentService.getCopagoAmount(),
    patientService.listBasic(),
  ]);

  return (
    <div>
      <PageHeader
        title="Finanzas"
        description="Cobros del mes: copagos y extras."
      />
      <FinanzasView
        month={month}
        year={year}
        summary={summary}
        copagoAmount={copagoAmount}
        patients={patients}
        todayKey={todayKey}
      />
    </div>
  );
}
