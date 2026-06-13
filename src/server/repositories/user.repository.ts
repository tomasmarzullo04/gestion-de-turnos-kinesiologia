import { prisma } from "@/lib/db";
import { type Role } from "@/lib/constants";

/** Acceso a datos de usuarios. Sin lógica de negocio. */
export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
    phone?: string | null;
  }) {
    return prisma.user.create({ data });
  },

  update(
    id: string,
    data: Partial<{ name: string; phone: string | null }>,
  ) {
    return prisma.user.update({ where: { id }, data });
  },

  /** Lista pacientes (para selectores del admin). */
  listPatients() {
    return prisma.user.findMany({
      where: { role: "PATIENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, phone: true },
    });
  },
};
