/**
 * Seed de datos demo para el modelo de CUPOS.
 *
 * Crea: 1 admin, 1 paciente, 1 profesional, plantillas lun–vie 08:00–21:00 con
 * capacidad 20 (cupos compartidos del estudio) y materializa las franjas de los
 * próximos 30 días.
 *
 * Idempotente. Ejecutar con:  npm run db:seed
 */
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@kinesio.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
const PATIENT_EMAIL = process.env.SEED_PATIENT_EMAIL ?? "paciente@kinesio.local";
const PATIENT_PASSWORD = process.env.SEED_PATIENT_PASSWORD ?? "Paciente123!";

const SALT_ROUNDS = 12;

// Defaults demo (coinciden con src/lib/booking-config.ts).
const CAPACITY = 20;
const DAY_START = "08:00";
const DAY_END = "21:00";
const GENERATION_DAYS = 30;

async function main() {
  console.log("🌱 Seed (cupos): iniciando…");

  // ── Usuarios (auth) ──────────────────────────────────────────────────────
  const [adminHash, patientHash] = await Promise.all([
    hash(ADMIN_PASSWORD, SALT_ROUNDS),
    hash(PATIENT_PASSWORD, SALT_ROUNDS),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: "Dra. Laura Giménez", role: "ADMIN" },
    create: {
      name: "Dra. Laura Giménez",
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
      role: "ADMIN",
      phone: "+54 11 5555-0001",
    },
  });

  const patient = await prisma.user.upsert({
    where: { email: PATIENT_EMAIL },
    update: { name: "Juan Pérez", role: "PATIENT" },
    create: {
      name: "Juan Pérez",
      email: PATIENT_EMAIL,
      passwordHash: patientHash,
      role: "PATIENT",
      phone: "+54 11 4444-0002",
    },
  });
  console.log(`👤 Admin: ${admin.email} · Paciente: ${patient.email}`);

  // ── Profesional (demo) ───────────────────────────────────────────────────
  const existingProf = await prisma.professional.findFirst({
    where: { name: "Dra. Laura Giménez" },
  });
  if (!existingProf) {
    await prisma.professional.create({
      data: { name: "Dra. Laura Giménez", specialty: "Kinesiología deportiva" },
    });
  }

  // ── Plantillas (lun–vie, 08–21, capacidad 20, cupos compartidos) ─────────
  // Reset idempotente de las plantillas demo (professional_id NULL = estudio).
  await prisma.$executeRaw`DELETE FROM slot_templates WHERE professional_id IS NULL`;
  for (let day = 1; day <= 5; day++) {
    await prisma.$executeRaw`
      INSERT INTO slot_templates (professional_id, day_of_week, start_time, end_time, capacity, active)
      VALUES (NULL, ${day}, ${DAY_START}::time, ${DAY_END}::time, ${CAPACITY}, true)
    `;
  }
  console.log("🗓️  Plantillas lun–vie 08:00–21:00 (capacidad 20) cargadas.");

  // ── Materializar franjas para los próximos N días ────────────────────────
  // Bloques de 1 hora dentro de cada ventana de plantilla activa, sin duplicar.
  const created = await prisma.$executeRaw`
    INSERT INTO slots (professional_id, date, start_time, end_time, capacity)
    SELECT t.professional_id, d::date, gs::time, (gs + interval '1 hour')::time, t.capacity
    FROM slot_templates t
    CROSS JOIN generate_series(
      current_date,
      current_date + (${GENERATION_DAYS - 1} || ' days')::interval,
      interval '1 day'
    ) AS d
    CROSS JOIN LATERAL generate_series(
      (d::date + t.start_time),
      (d::date + t.end_time) - interval '1 hour',
      interval '1 hour'
    ) AS gs
    WHERE t.active
      AND extract(dow FROM d) = t.day_of_week
      AND NOT EXISTS (
        SELECT 1 FROM slots s
        WHERE s.date = d::date
          AND s.start_time = gs::time
          AND s.professional_id IS NOT DISTINCT FROM t.professional_id
      )
  `;
  console.log(`📌 Franjas materializadas: ${created} (próximos ${GENERATION_DAYS} días).`);

  console.log(
    `\n✅ Seed completo.\n` +
      `   Admin    → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}\n` +
      `   Paciente → ${PATIENT_EMAIL} / ${PATIENT_PASSWORD}`,
  );
}

main()
  .catch((error) => {
    console.error("❌ Error durante el seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
