/**
 * Seed de datos demo (Apex · Entrenamiento).
 *
 * Crea: 1 admin, 1 socio de prueba, el equipo (Jeremías Mansilla y Bautista Calvo),
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

// Horizonte de materialización (coincide con src/lib/booking-config.ts).
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
  // en "Nuestro equipo" y en el ABM del profesional.
  // Limpieza de nombres de demo anteriores.
  await prisma.professional.deleteMany({
    where: { name: { in: ["Tomi", "Dra. Laura Giménez"] } },
  });
  const team = [
    { name: "Jeremías Mansilla", specialty: "Entrenamiento" },
    { name: "Bautista Calvo", specialty: "Entrenamiento" },
  ];
  for (const member of team) {
    const existing = await prisma.professional.findFirst({
      where: { name: member.name },
    });
    if (!existing) await prisma.professional.create({ data: member });
  }
  console.log("🏋️  Equipo: Jeremías Mansilla, Bautista Calvo.");

  // ── Servicios (RPG / Recovery / Respi / Gym / Rehab) ──────────────────────
  const serviceDefs = [
    { name: "RPG", slug: "rpg", color: "#0f766e", capacity: 1 },
    { name: "Recovery", slug: "recovery", color: "#0284c7", capacity: 2 },
    { name: "Respi", slug: "respi", color: "#7c3aed", capacity: 4 },
    { name: "Gym", slug: "gym", color: "#d97706", capacity: 6 },
    { name: "Rehab", slug: "rehab", color: "#dc2626", capacity: 5 },
  ];
  const serviceId: Record<string, string> = {};
  for (const s of serviceDefs) {
    const svc = await prisma.service.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        color: s.color,
        capacity: s.capacity,
        active: true,
      },
      create: {
        name: s.name,
        slug: s.slug,
        color: s.color,
        capacity: s.capacity,
        active: true,
      },
    });
    serviceId[s.slug] = svc.id;
  }
  console.log(`💪 Servicios: ${serviceDefs.map((s) => s.name).join(", ")}.`);

  // ── Plantillas por servicio (cupo general, professional_id NULL) ──────────
  // RPG: Lun–Vie 08–20 (cap 1) · turnos de 1 persona/hora.
  // Recovery: Mar/Jue 08–13 y Vie 12–16 (cap 2).
  // Respi: Mar/Jue 16–18 (cap 4).
  // Gym: Lun/Mié/Vie 08–12 y 16–20 (cap 6).
  // Rehab: Lun/Mié/Vie 08–12 y 16–20 (cap 5).
  const templateDefs: {
    slug: string;
    days: number[];
    start: string;
    end: string;
    cap: number;
  }[] = [
    { slug: "rpg", days: [1, 2, 3, 4, 5], start: "08:00", end: "20:00", cap: 1 },
    { slug: "recovery", days: [2, 4], start: "08:00", end: "13:00", cap: 2 },
    { slug: "recovery", days: [5], start: "12:00", end: "16:00", cap: 2 },
    { slug: "respi", days: [2, 4], start: "16:00", end: "18:00", cap: 4 },
    { slug: "gym", days: [1, 3, 5], start: "08:00", end: "12:00", cap: 6 },
    { slug: "gym", days: [1, 3, 5], start: "16:00", end: "20:00", cap: 6 },
    { slug: "rehab", days: [1, 3, 5], start: "08:00", end: "12:00", cap: 5 },
    { slug: "rehab", days: [1, 3, 5], start: "16:00", end: "20:00", cap: 5 },
  ];

  // Reset de plantillas generales (no toca las asignadas a un profesional).
  await prisma.$executeRaw`DELETE FROM slot_templates WHERE professional_id IS NULL`;
  for (const t of templateDefs) {
    for (const day of t.days) {
      await prisma.$executeRaw`
        INSERT INTO slot_templates (professional_id, service_id, day_of_week, start_time, end_time, capacity, active)
        VALUES (NULL, ${serviceId[t.slug]}::uuid, ${day}, ${t.start}::time, ${t.end}::time, ${t.cap}, true)
      `;
    }
  }
  console.log("🗓️  Plantillas por servicio cargadas.");

  // Limpieza: franjas futuras generales viejas (sin servicio) y sin reservas.
  await prisma.$executeRaw`
    DELETE FROM slots
    WHERE service_id IS NULL AND date >= current_date AND booked_count = 0
  `;

  // ── Materializar franjas para los próximos N días (por servicio) ──────────
  const created = await prisma.$executeRaw`
    INSERT INTO slots (professional_id, service_id, date, start_time, end_time, capacity)
    SELECT t.professional_id, t.service_id, d::date, gs::time, (gs + interval '1 hour')::time, t.capacity
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
          AND s.service_id IS NOT DISTINCT FROM t.service_id
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
