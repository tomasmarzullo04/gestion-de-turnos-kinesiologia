import type { Metadata } from "next";

import { FinanzasView } from "@/app/(admin)/admin/finanzas/finanzas-view";
import { PageHeader } from "@/components/shared/page-header";
import { toLocalDateKey } from "@/lib/datetime";
import { formatCycleLabel, getCurrentCycle } from "@/lib/financial-cycle";
import { patientService } from "@/server/services/patient.service";
import { paymentService } from "@/server/services/payment.service";
import { serviceService } from "@/server/services/service.service";

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
  searchParams: Promise<{ m?: string; y?: string; service?: string }>;
}) {
  const sp = await searchParams;
  const todayKey = toLocalDateKey(new Date());
  // Por defecto, el ciclo financiero (15 a 15) en el que cae hoy.
  const current = getCurrentCycle(todayKey);
  const month = clampMonth(Number(sp.m), current.month);
  const year = clampYear(Number(sp.y), current.year);

  const serviceId = sp.service;

  const [summary, copagoAmount, patients, services] = await Promise.all([
    paymentService.getPeriodSummary(month, year, serviceId),
    paymentService.getCopagoAmount(),
    patientService.listBasic(),
    serviceService.listActive(),
  ]);

  return (
    <div>
      <PageHeader
        title="Finanzas"
        description="Cobros del período (ciclo de cierre del 15 al 15): copagos y extras."
      />
      <FinanzasView
        month={month}
        year={year}
        periodLabel={formatCycleLabel(month, year)}
        summary={summary}
        copagoAmount={copagoAmount}
        patients={patients}
        todayKey={todayKey}
        services={services.map((s) => ({ id: s.id, name: s.name }))}
        selectedServiceId={serviceId}
      />
    </div>
  );
}
