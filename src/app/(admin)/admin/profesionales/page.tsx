import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { ProfessionalsManager } from "@/app/(admin)/admin/profesionales/professionals-manager";
import { professionalService } from "@/server/services/professional.service";

export const metadata: Metadata = { title: "Profesionales" };
export const dynamic = "force-dynamic";

export default async function ProfessionalsPage() {
  const professionals = await professionalService.list();

  return (
    <div>
      <PageHeader
        title="Profesionales"
        description="Administrá los kinesiólogos de la consultoría."
      />
      <ProfessionalsManager
        professionals={professionals.map((p) => ({
          id: p.id,
          name: p.name,
          specialty: p.specialty,
          bio: p.bio,
          active: p.active,
          appointmentsCount: p._count.appointments,
          availabilitiesCount: p._count.availabilities,
        }))}
      />
    </div>
  );
}
