import { prisma } from "@/lib/db";

export const professionalRepository = {
  list() {
    return prisma.professional.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { _count: { select: { appointments: true, availabilities: true } } },
    });
  },

  listActive() {
    return prisma.professional.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  },

  findById(id: string) {
    return prisma.professional.findUnique({ where: { id } });
  },

  findByIdWithAvailability(id: string) {
    return prisma.professional.findUnique({
      where: { id },
      include: { availabilities: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] } },
    });
  },

  create(data: {
    name: string;
    specialty?: string | null;
    bio?: string | null;
    active?: boolean;
  }) {
    return prisma.professional.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      specialty: string | null;
      bio: string | null;
      active: boolean;
    }>,
  ) {
    return prisma.professional.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.professional.delete({ where: { id } });
  },

  countActiveAppointments(id: string) {
    return prisma.appointment.count({
      where: {
        professionalId: id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { gte: new Date() },
      },
    });
  },
};
