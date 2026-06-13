import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { ServicesManager } from "@/app/(admin)/admin/servicios/services-manager";
import { serviceService } from "@/server/services/service.service";

export const metadata: Metadata = { title: "Servicios" };
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await serviceService.list();

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="Gestioná los servicios que ofrece la consultoría."
      />
      <ServicesManager
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          durationMinutes: s.durationMinutes,
          active: s.active,
        }))}
      />
    </div>
  );
}
