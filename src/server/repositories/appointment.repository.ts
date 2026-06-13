import { type Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  ACTIVE_STATUSES,
  type AppointmentStatus,
} from "@/lib/constants";

/** Relaciones que la UI necesita habitualmente junto a un turno. */
const withRelations = {
  patient: { select: { id: true, name: true, email: true, phone: true } },
  professional: { select: { id: true, name: true, specialty: true } },
  service: { select: { id: true, name: true, durationMinutes: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof withRelations;
}>;

export interface AppointmentFilters {
  professionalId?: string;
  patientId?: string;
  status?: AppointmentStatus;
  from?: Date;
  to?: Date;
}

function buildWhere(filters: AppointmentFilters): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = {};
  if (filters.professionalId) where.professionalId = filters.professionalId;
  if (filters.patientId) where.patientId = filters.patientId;
  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.startsAt = {};
    if (filters.from) where.startsAt.gte = filters.from;
    if (filters.to) where.startsAt.lte = filters.to;
  }
  return where;
}

export const appointmentRepository = {
  findById(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      include: withRelations,
    });
  },

  list(filters: AppointmentFilters = {}, order: "asc" | "desc" = "asc") {
    return prisma.appointment.findMany({
      where: buildWhere(filters),
      include: withRelations,
      orderBy: { startsAt: order },
    });
  },

  /**
   * Turnos de un profesional que se cruzan con el rango [startsAt, endsAt).
   * Solo considera estados activos (PENDING/CONFIRMED). Permite excluir un id
   * (útil al reprogramar). Dos intervalos se solapan si a.start < b.end && a.end > b.start.
   */
  findOverlapping(
    professionalId: string,
    startsAt: Date,
    endsAt: Date,
    excludeId?: string,
  ) {
    return prisma.appointment.findFirst({
      where: {
        professionalId,
        status: { in: ACTIVE_STATUSES },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  },

  /** Turnos activos de un profesional dentro de un día (para calcular slots). */
  findActiveInRange(professionalId: string, from: Date, to: Date) {
    return prisma.appointment.findMany({
      where: {
        professionalId,
        status: { in: ACTIVE_STATUSES },
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      orderBy: { startsAt: "asc" },
      select: { startsAt: true, endsAt: true },
    });
  },

  listByPatient(patientId: string, order: "asc" | "desc" = "asc") {
    return prisma.appointment.findMany({
      where: { patientId },
      include: withRelations,
      orderBy: { startsAt: order },
    });
  },

  create(data: {
    patientId: string;
    professionalId: string;
    serviceId: string;
    startsAt: Date;
    endsAt: Date;
    status: AppointmentStatus;
    notes?: string | null;
  }) {
    return prisma.appointment.create({ data, include: withRelations });
  },

  update(
    id: string,
    data: Prisma.AppointmentUpdateInput,
  ) {
    return prisma.appointment.update({
      where: { id },
      data,
      include: withRelations,
    });
  },

  count(where: Prisma.AppointmentWhereInput) {
    return prisma.appointment.count({ where });
  },

  /** Acceso al cliente para transacciones (overlap + create atómicos). */
  client: prisma,
};
