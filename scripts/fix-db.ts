import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🛠 Corrigiendo esquema de base de datos...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN tipo_cobertura DROP DEFAULT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN tipo_cobertura TYPE VARCHAR(50) USING tipo_cobertura::text;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN tipo_cobertura SET DEFAULT 'PARTICULAR';`);
    await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS coverage_type CASCADE;`);
    console.log("✅ Columna tipo_cobertura actualizada a VARCHAR.");
  } catch (error) {
    console.error("❌ Error corrigiendo la base de datos:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
