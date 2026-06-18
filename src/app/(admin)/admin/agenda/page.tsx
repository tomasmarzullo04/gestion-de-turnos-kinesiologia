import type { Metadata } from "next";

import { AgendaClient } from "@/app/(admin)/admin/agenda/agenda-client";
import { PageHeader } from "@/components/shared/page-header";
import { toLocalDateKey } from "@/lib/datetime";
import { slotService } from "@/server/services/slot.service";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const days = await slotService.getUpcomingDays();

  const todayKey = toLocalDateKey(new Date());
  const selectedDate =
    date && DATE_KEY.test(date)
      ? date
      : (days[0]?.date ?? todayKey);

  const slots = await slotService.getAdminDay(selectedDate);

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Generá franjas, revisá inscriptos y gestioná cada bloque."
      />
      <AgendaClient days={days} selectedDate={selectedDate} slots={slots} />
    </div>
  );
}
