import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma como singleton.
 * En desarrollo, Next.js recarga los módulos en caliente; sin el singleton se
 * crearían múltiples conexiones. En producción se instancia una sola vez.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
