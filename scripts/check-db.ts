/**
 * Verifica la conexión a la base de datos (Supabase/Postgres) y lista las
 * tablas del esquema `public`. Usa $queryRaw, compatible con el pooler de
 * transacción (pgbouncer=true), sin prepared statements persistentes.
 *
 * Uso:  npm run db:check
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Probando conexión a la base de datos…");

  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  console.log("✅ Conexión OK.");
  if (tables.length === 0) {
    console.log("ℹ️  No hay tablas en el esquema 'public' todavía.");
  } else {
    console.log(`📋 Tablas en 'public' (${tables.length}):`);
    for (const t of tables) console.log("   -", t.table_name);
  }
}

main()
  .catch((error) => {
    console.error("❌ No se pudo conectar a la base de datos:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
