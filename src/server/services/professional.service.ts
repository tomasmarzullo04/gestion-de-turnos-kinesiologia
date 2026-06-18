import { prisma } from "@/lib/db";

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

  create: (data: { name: string; specialty?: string | null }) =>
    prisma.professional.create({ data }),
};
