import type { Metadata } from "next";

import { TemplatesManager } from "@/app/(admin)/admin/plantillas/templates-manager";
import { PageHeader } from "@/components/shared/page-header";
import { slotTemplateService } from "@/server/services/slot-template.service";
import { serviceService } from "@/server/services/service.service";

export const metadata: Metadata = { title: "Plantillas" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const [templates, services] = await Promise.all([
    slotTemplateService.list(),
    serviceService.listActive(),
  ]);

  return (
    <div>
      <PageHeader
        title="Plantillas"
        description="Configurá los horarios, días y cupos de cada servicio. Los cambios se publican solos."
      />
      <TemplatesManager
        services={services}
        templates={templates.map((t) => ({
          id: t.id,
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          endTime: t.endTime,
          capacity: t.capacity,
          active: t.active,
          serviceId: t.serviceId,
          serviceName: t.serviceName,
          serviceColor: t.serviceColor,
        }))}
      />
    </div>
  );
}
