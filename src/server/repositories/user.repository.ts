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

  /** Busca varios usuarios por id (para resolver inscriptos a una franja). */
  findManyByIds(ids: string[]) {
    return prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true, phone: true },
    });
  },

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
    phone?: string | null;
    tipoCoberturaString?: string | null;
    obraSocialNombre?: string | null;
    requiereCopago?: boolean;
    montoCopago?: number | null;
    esPrimeraVez?: boolean;
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
