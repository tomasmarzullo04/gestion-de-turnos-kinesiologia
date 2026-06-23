import type { Metadata } from "next";

import { ProfessionalsManager } from "@/app/(admin)/admin/profesionales/professionals-manager";
import { PageHeader } from "@/components/shared/page-header";
import { professionalService } from "@/server/services/professional.service";
import { serviceService } from "@/server/services/service.service";

export const metadata: Metadata = { title: "Profesionales" };
export const dynamic = "force-dynamic";

export default async function ProfessionalsPage() {
  const [professionals, services] = await Promise.all([
    professionalService.list(),
    serviceService.listActive(),
  ]);

  return (
    <div>
      <PageHeader
        title="Profesionales"
        description="Gestioná el equipo de profesionales del estudio."
      />
      <ProfessionalsManager
        services={services}
        professionals={professionals.map((p) => ({
          id: p.id,
          name: p.name,
          specialty: p.specialty,
          active: p.active,
          serviceIds: p.serviceIds,
          serviceNames: p.serviceNames,
        }))}
      />
    </div>
  );
}
