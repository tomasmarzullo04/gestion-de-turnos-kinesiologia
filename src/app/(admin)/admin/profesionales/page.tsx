import type { Metadata } from "next";

import { ProfessionalsManager } from "@/app/(admin)/admin/profesionales/professionals-manager";
import { PageHeader } from "@/components/shared/page-header";
import { professionalService } from "@/server/services/professional.service";

export const metadata: Metadata = { title: "Profesionales" };
export const dynamic = "force-dynamic";

export default async function ProfessionalsPage() {
  const professionals = await professionalService.list();

  return (
    <div>
      <PageHeader
        title="Profesionales"
        description="Administrá el equipo de profesionales del estudio."
      />
      <ProfessionalsManager
        professionals={professionals.map((p) => ({
          id: p.id,
          name: p.name,
          specialty: p.specialty,
          active: p.active,
        }))}
      />
    </div>
  );
}
