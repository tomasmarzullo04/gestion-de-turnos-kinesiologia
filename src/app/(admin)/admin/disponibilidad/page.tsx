import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { AvailabilityManager } from "@/app/(admin)/admin/disponibilidad/availability-manager";
import { availabilityService } from "@/server/services/availability.service";
import { professionalService } from "@/server/services/professional.service";

export const metadata: Metadata = { title: "Disponibilidad" };
export const dynamic = "force-dynamic";

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ professionalId?: string }>;
}) {
  const { professionalId } = await searchParams;
  const professionals = await professionalService.listActive();

  const selectedId =
    professionalId && professionals.some((p) => p.id === professionalId)
      ? professionalId
      : (professionals[0]?.id ?? null);

  const availabilities = selectedId
    ? await availabilityService.listByProfessional(selectedId)
    : [];

  return (
    <div>
      <PageHeader
        title="Disponibilidad"
        description="Definí los horarios de atención de cada profesional."
      />
      <AvailabilityManager
        professionals={professionals.map((p) => ({ id: p.id, name: p.name }))}
        selectedId={selectedId}
        availabilities={availabilities.map((a) => ({
          id: a.id,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
        }))}
      />
    </div>
  );
}
