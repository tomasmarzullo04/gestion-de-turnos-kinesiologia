import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function run() {
  const routines = await prisma.$queryRaw`SELECT routine_name FROM information_schema.routines WHERE specific_schema = 'public'`;
  console.log("Routines:", routines);
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log("Tables:", tables);
}
run().finally(() => prisma.$disconnect());
