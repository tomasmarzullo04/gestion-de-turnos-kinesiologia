import { prisma } from "@/lib/db";

export const availabilityRepository = {
  listByProfessional(professionalId: string) {
    return prisma.availability.findMany({
      where: { professionalId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  },

  listByProfessionalAndDay(professionalId: string, dayOfWeek: number) {
    return prisma.availability.findMany({
      where: { professionalId, dayOfWeek },
      orderBy: { startTime: "asc" },
    });
  },

  findById(id: string) {
    return prisma.availability.findUnique({ where: { id } });
  },

  create(data: {
    professionalId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }) {
    return prisma.availability.create({ data });
  },

  delete(id: string) {
    return prisma.availability.delete({ where: { id } });
  },
};
