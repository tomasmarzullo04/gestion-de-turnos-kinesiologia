/**
 * Seed de datos de ejemplo.
 *
 * Crea: 1 admin, 2 profesionales (uno vinculado al admin), 3 servicios,
 * disponibilidad de muestra y 1 paciente de prueba, además de algunos turnos.
 *
 * Es idempotente: puede ejecutarse varias veces sin duplicar datos.
 * Ejecutar con:  npm run db:seed   (o  npx prisma db seed)
 */
import { hash } from "bcryptjs";

import { PrismaClient } from "@prisma/client";
import {
  APPOINTMENT_STATUS,
  ROLES,
  SLOT_INTERVAL_MINUTES,
} from "../src/lib/constants";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@kinesio.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
const PATIENT_EMAIL = process.env.SEED_PATIENT_EMAIL ?? "paciente@kinesio.local";
const PATIENT_PASSWORD = process.env.SEED_PATIENT_PASSWORD ?? "Paciente123!";

const SALT_ROUNDS = 12;

/** Combina día (local) + "HH:mm" en un Date. Para el seed alcanza la hora local del runner. */
function atTime(base: Date, time: string): Date {
  const [h, m] = time.split(":").map((n) => Number.parseInt(n, 10));
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Seed: iniciando…");

  // ── Usuarios ───────────────────────────────────────────────────────────
  const adminPasswordHash = await hash(ADMIN_PASSWORD, SALT_ROUNDS);
  const patientPasswordHash = await hash(PATIENT_PASSWORD, SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: "Dra. Laura Giménez", role: ROLES.ADMIN },
    create: {
      name: "Dra. Laura Giménez",
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      phone: "+54 11 5555-0001",
    },
  });

  const patient = await prisma.user.upsert({
    where: { email: PATIENT_EMAIL },
    update: { name: "Juan Pérez", role: ROLES.PATIENT },
    create: {
      name: "Juan Pérez",
      email: PATIENT_EMAIL,
      passwordHash: patientPasswordHash,
      role: ROLES.PATIENT,
      phone: "+54 11 4444-0002",
    },
  });

  console.log(`👤 Admin: ${admin.email}`);
  console.log(`👤 Paciente: ${patient.email}`);

  // ── Profesionales ─────────────────────────────────────────────────────
  // Profesional 1: vinculado a la cuenta admin.
  let prof1 = await prisma.professional.findFirst({
    where: { userId: admin.id },
  });
  if (!prof1) {
    prof1 = await prisma.professional.create({
      data: {
        name: "Dra. Laura Giménez",
        specialty: "Kinesiología deportiva",
        bio: "Especialista en rehabilitación deportiva y RPG.",
        userId: admin.id,
      },
    });
  }

  // Profesional 2: sin cuenta de usuario (gestionado por el admin).
  let prof2 = await prisma.professional.findFirst({
    where: { name: "Lic. Martín Sosa" },
  });
  if (!prof2) {
    prof2 = await prisma.professional.create({
      data: {
        name: "Lic. Martín Sosa",
        specialty: "Kinesiología respiratoria",
        bio: "Rehabilitación respiratoria y kinefilaxia.",
      },
    });
  }

  console.log(`🩺 Profesionales: ${prof1.name}, ${prof2.name}`);

  // ── Servicios ───────────────────────────────────────────────────────────
  const servicesData = [
    {
      name: "Sesión RPG",
      description: "Reeducación postural global. Sesión individual.",
      durationMinutes: 45,
    },
    {
      name: "Rehabilitación deportiva",
      description: "Tratamiento de lesiones y recuperación funcional.",
      durationMinutes: 60,
    },
    {
      name: "Evaluación inicial",
      description: "Primera consulta y diagnóstico kinesiológico.",
      durationMinutes: 30,
    },
  ];

  const services = [];
  for (const data of servicesData) {
    const existing = await prisma.service.findFirst({
      where: { name: data.name },
    });
    const service = existing
      ? await prisma.service.update({ where: { id: existing.id }, data })
      : await prisma.service.create({ data });
    services.push(service);
  }
  console.log(`💼 Servicios: ${services.map((s) => s.name).join(", ")}`);

  // ── Disponibilidad ───────────────────────────────────────────────────────
  // Profesional 1: Lun–Vie 09:00–13:00 y 15:00–19:00.
  // Profesional 2: Lun, Mié, Vie 10:00–14:00.
  const availabilities: Array<{
    professionalId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }> = [];

  for (let day = 1; day <= 5; day++) {
    availabilities.push(
      { professionalId: prof1.id, dayOfWeek: day, startTime: "09:00", endTime: "13:00" },
      { professionalId: prof1.id, dayOfWeek: day, startTime: "15:00", endTime: "19:00" },
    );
  }
  for (const day of [1, 3, 5]) {
    availabilities.push({
      professionalId: prof2.id,
      dayOfWeek: day,
      startTime: "10:00",
      endTime: "14:00",
    });
  }

  for (const av of availabilities) {
    await prisma.availability.upsert({
      where: {
        professionalId_dayOfWeek_startTime_endTime: {
          professionalId: av.professionalId,
          dayOfWeek: av.dayOfWeek,
          startTime: av.startTime,
          endTime: av.endTime,
        },
      },
      update: {},
      create: av,
    });
  }
  console.log(`🗓️  Disponibilidad cargada (${availabilities.length} franjas).`);

  // ── Turnos de ejemplo ────────────────────────────────────────────────────
  const existingAppointments = await prisma.appointment.count();
  if (existingAppointments === 0) {
    const evaluation = services.find((s) => s.name === "Evaluación inicial")!;
    const rpg = services.find((s) => s.name === "Sesión RPG")!;

    // Próximo turno (en 3 días, 10:00) — confirmado.
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    const start1 = atTime(inThreeDays, "10:00");
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        professionalId: prof1.id,
        serviceId: evaluation.id,
        startsAt: start1,
        endsAt: new Date(start1.getTime() + evaluation.durationMinutes * 60_000),
        status: APPOINTMENT_STATUS.CONFIRMED,
        notes: "Primera consulta. Traer estudios previos.",
      },
    });

    // Turno histórico (hace 5 días) — completado.
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const start2 = atTime(fiveDaysAgo, "16:00");
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        professionalId: prof1.id,
        serviceId: rpg.id,
        startsAt: start2,
        endsAt: new Date(start2.getTime() + rpg.durationMinutes * 60_000),
        status: APPOINTMENT_STATUS.COMPLETED,
      },
    });

    console.log("📌 Turnos de ejemplo creados (1 confirmado, 1 completado).");
  } else {
    console.log("📌 Ya existían turnos; se omite la carga de ejemplos.");
  }

  console.log(
    `\n✅ Seed completado. Granularidad de slots: ${SLOT_INTERVAL_MINUTES} min.\n` +
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
