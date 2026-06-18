/**
 * Seed de datos demo (Apex · Entrenamiento).
 *
 * Crea: 1 admin, 1 socio de prueba, el equipo (Tomi y Jeremías Mansilla),
 * plantillas de horarios del gimnasio (cupo general de 10 por franja) y
 * materializa las franjas de los próximos 30 días.
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

// Defaults reales del gimnasio (coinciden con src/lib/booking-config.ts).
const CAPACITY = 10;
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
    update: { name: "Recepción Apex", role: "ADMIN" },
    create: {
      name: "Recepción Apex",
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

  // ── Responsables de entrenamiento (equipo) ───────────────────────────────
  // No se asignan a las franjas: el cupo es general del gimnasio. Se muestran
  // en "Nuestro equipo" y en el ABM del admin.
  const team = [
    { name: "Tomi", specialty: "Entrenamiento" },
    { name: "Jeremías Mansilla", specialty: "Entrenamiento" },
  ];
  for (const member of team) {
    const existing = await prisma.professional.findFirst({
      where: { name: member.name },
    });
    if (!existing) await prisma.professional.create({ data: member });
  }
  console.log("🏋️  Equipo: Tomi, Jeremías Mansilla.");

  // ── Plantillas de horarios del gimnasio (cupo general, professional_id NULL) ─
  // Lun–Vie 08:00–21:00 y Sáb 09:00–13:00, capacidad por bloque = CAPACITY.
  await prisma.$executeRaw`DELETE FROM slot_templates WHERE professional_id IS NULL`;
  for (let day = 1; day <= 5; day++) {
    await prisma.$executeRaw`
      INSERT INTO slot_templates (professional_id, day_of_week, start_time, end_time, capacity, active)
      VALUES (NULL, ${day}, ${DAY_START}::time, ${DAY_END}::time, ${CAPACITY}, true)
    `;
  }
  // Sábado (day_of_week = 6): turno mañana.
  await prisma.$executeRaw`
    INSERT INTO slot_templates (professional_id, day_of_week, start_time, end_time, capacity, active)
    VALUES (NULL, 6, '09:00'::time, '13:00'::time, ${CAPACITY}, true)
  `;
  console.log(`🗓️  Plantillas Lun–Vie 08–21 y Sáb 09–13 (capacidad ${CAPACITY}) cargadas.`);

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
