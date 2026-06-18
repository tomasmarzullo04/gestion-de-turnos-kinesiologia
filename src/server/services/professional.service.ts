import { prisma } from "@/lib/db";
import { type ProfessionalInput } from "@/lib/validations/professional";

function normalize(input: ProfessionalInput) {
  return {
    name: input.name,
    specialty: input.specialty ? input.specialty : null,
    active: input.active,
  };
}

/** Profesionales del estudio (modelo de cupos). */
export const professionalService = {
  list: () =>
    prisma.professional.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),

  listActive: () =>
    prisma.professional.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),

  findById: (id: string) => prisma.professional.findUnique({ where: { id } }),

  create: (input: ProfessionalInput) =>
    prisma.professional.create({ data: normalize(input) }),

  update: (id: string, input: ProfessionalInput) =>
    prisma.professional.update({ where: { id }, data: normalize(input) }),

  setActive: (id: string, active: boolean) =>
    prisma.professional.update({ where: { id }, data: { active } }),
};
