import type { Metadata } from "next";

import { TemplatesManager } from "@/app/(admin)/admin/plantillas/templates-manager";
import { PageHeader } from "@/components/shared/page-header";
import { slotTemplateService } from "@/server/services/slot-template.service";

export const metadata: Metadata = { title: "Plantillas" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await slotTemplateService.list();

  return (
    <div>
      <PageHeader
        title="Plantillas"
        description="Horario del estudio por día y capacidad de cada bloque."
      />
      <TemplatesManager
        templates={templates.map((t) => ({
          id: t.id,
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          endTime: t.endTime,
          capacity: t.capacity,
          active: t.active,
        }))}
      />
    </div>
  );
}
