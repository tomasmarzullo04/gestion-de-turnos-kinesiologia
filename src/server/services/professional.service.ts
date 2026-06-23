import { prisma } from "@/lib/db";
import { type ProfessionalInput } from "@/lib/validations/professional";

function normalize(input: ProfessionalInput) {
  return {
    name: input.name,
    specialty: input.specialty ? input.specialty : null,
    active: input.active,
  };
}

export interface ProfessionalView {
  id: string;
  name: string;
  specialty: string | null;
  active: boolean;
  createdAt: Date;
  serviceIds: string[];
  serviceNames: string[];
}

/** Profesionales del estudio (modelo de cupos). */
export const professionalService = {
  async list(): Promise<ProfessionalView[]> {
    const professionals = await prisma.professional.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        services: {
          include: { service: { select: { id: true, name: true } } },
        },
      },
    });
    return professionals.map(toView);
  },

  async listActive(): Promise<ProfessionalView[]> {
    const professionals = await prisma.professional.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        services: {
          include: { service: { select: { id: true, name: true } } },
        },
      },
    });
    return professionals.map(toView);
  },

  findById: (id: string) => prisma.professional.findUnique({ where: { id } }),

  async create(input: ProfessionalInput) {
    const professional = await prisma.professional.create({
      data: normalize(input),
    });

    // Vincular servicios
    if (input.serviceIds && input.serviceIds.length > 0) {
      await prisma.professionalService.createMany({
        data: input.serviceIds.map((serviceId) => ({
          professionalId: professional.id,
          serviceId,
        })),
      });
    }

    return professional;
  },

  async update(id: string, input: ProfessionalInput) {
    const professional = await prisma.professional.update({
      where: { id },
      data: normalize(input),
    });

    // Reemplazar vínculos de servicios (delete + insert)
    await prisma.professionalService.deleteMany({
      where: { professionalId: id },
    });

    if (input.serviceIds && input.serviceIds.length > 0) {
      await prisma.professionalService.createMany({
        data: input.serviceIds.map((serviceId) => ({
          professionalId: id,
          serviceId,
        })),
      });
    }

    return professional;
  },

  setActive: (id: string, active: boolean) =>
    prisma.professional.update({ where: { id }, data: { active } }),
};

function toView(
  p: {
    id: string;
    name: string;
    specialty: string | null;
    active: boolean;
    createdAt: Date;
    services: { service: { id: string; name: string } }[];
  },
): ProfessionalView {
  return {
    id: p.id,
    name: p.name,
    specialty: p.specialty,
    active: p.active,
    createdAt: p.createdAt,
    serviceIds: p.services.map((s) => s.service.id),
    serviceNames: p.services.map((s) => s.service.name),
  };
}
