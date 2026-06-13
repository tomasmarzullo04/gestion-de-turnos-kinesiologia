import { prisma } from "@/lib/db";

export const serviceRepository = {
  list() {
    return prisma.service.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
  },

  listActive() {
    return prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  },

  findById(id: string) {
    return prisma.service.findUnique({ where: { id } });
  },

  create(data: {
    name: string;
    description?: string | null;
    durationMinutes: number;
    active?: boolean;
  }) {
    return prisma.service.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      durationMinutes: number;
      active: boolean;
    }>,
  ) {
    return prisma.service.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.service.delete({ where: { id } });
  },

  countActiveAppointments(id: string) {
    return prisma.appointment.count({
      where: {
        serviceId: id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { gte: new Date() },
      },
    });
  },
};
