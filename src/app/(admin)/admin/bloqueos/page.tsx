import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { blockService } from "@/server/services/block.service";
import { serviceService } from "@/server/services/service.service";
import { BloqueosView } from "@/app/(admin)/admin/bloqueos/bloqueos-view";

export const metadata: Metadata = { title: "Bloqueos" };
export const dynamic = "force-dynamic";

export default async function BloqueosPage() {
  const [blocks, services] = await Promise.all([
    blockService.listActive(),
    serviceService.listActive(),
  ]);

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader
        title="Bloqueos"
        description="Gestioná los bloqueos de agenda. Los bloqueos impiden que los pacientes reserven turnos en las fechas y horarios indicados."
      />
      <BloqueosView
        initialBlocks={blocks}
        services={services.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
      />
    </div>
  );
}
