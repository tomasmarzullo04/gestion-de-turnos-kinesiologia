import { addMinutes, isBefore } from "date-fns";

import {
  ACTIVE_STATUSES,
  APPOINTMENT_STATUS,
  BOOKING_MIN_LEAD_HOURS,
  CANCELLATION_MIN_HOURS,
  ROLES,
  SLOT_INTERVAL_MINUTES,
  type AppointmentStatus,
  type Role,
} from "@/lib/constants";
import {
  combineDateAndTime,
  formatTime,
  minutesToTime,
  parseLocalDateKey,
  timeToMinutes,
  toLocalDateKey,
  utcToZoned,
} from "@/lib/datetime";
import { logger } from "@/lib/logger";
import { BusinessError, NotFoundError } from "@/server/errors";
import {
  appointmentRepository,
  type AppointmentFilters,
} from "@/server/repositories/appointment.repository";
import { availabilityRepository } from "@/server/repositories/availability.repository";
import { professionalRepository } from "@/server/repositories/professional.repository";
import { serviceRepository } from "@/server/repositories/service.repository";
import { type TimeSlot } from "@/types";

// ── Transiciones de estado permitidas ───────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "COMPLETED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
};

interface Interval {
  start: Date;
  end: Date;
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}

export const appointmentService = {
  // ── Cálculo de slots disponibles ──────────────────────────────────────────
  /**
   * Calcula los horarios libres para reservar un servicio con un profesional en
   * una fecha (clave "YYYY-MM-DD" en la zona de la consultoría).
   *
   * Considera: disponibilidad del día, duración del servicio, turnos ya
   * tomados (sin solapar) y la antelación mínima de reserva.
   */
  async getAvailableSlots(
    professionalId: string,
    serviceId: string,
    dateKey: string,
  ): Promise<TimeSlot[]> {
    const [professional, service] = await Promise.all([
      professionalRepository.findById(professionalId),
      serviceRepository.findById(serviceId),
    ]);

    if (!professional || !professional.active) return [];
    if (!service || !service.active) return [];

    const day = parseLocalDateKey(dateKey);
    const dayOfWeek = day.getDay();
    const duration = service.durationMinutes;

    const windows = await availabilityRepository.listByProfessionalAndDay(
      professionalId,
      dayOfWeek,
    );
    if (windows.length === 0) return [];

    // Límites UTC del día para traer los turnos activos relevantes.
    const dayStart = combineDateAndTime(day, "00:00");
    const dayEnd = addMinutes(dayStart, 24 * 60);
    const taken = await appointmentRepository.findActiveInRange(
      professionalId,
      dayStart,
      dayEnd,
    );
    const takenIntervals: Interval[] = taken.map((t) => ({
      start: t.startsAt,
      end: t.endsAt,
    }));

    const minStart = addMinutes(new Date(), BOOKING_MIN_LEAD_HOURS * 60);
    const slots: TimeSlot[] = [];

    for (const window of windows) {
      const windowStart = timeToMinutes(window.startTime);
      const windowEnd = timeToMinutes(window.endTime);

      for (
        let t = windowStart;
        t + duration <= windowEnd;
        t += SLOT_INTERVAL_MINUTES
      ) {
        const startsAt = combineDateAndTime(day, minutesToTime(t));
        const endsAt = addMinutes(startsAt, duration);

        // Respetar la antelación mínima de reserva.
        if (isBefore(startsAt, minStart)) continue;

        // Descartar si se solapa con un turno ya tomado.
        const candidate: Interval = { start: startsAt, end: endsAt };
        if (takenIntervals.some((interval) => overlaps(candidate, interval))) {
          continue;
        }

        slots.push({
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          label: formatTime(startsAt),
        });
      }
    }

    return slots;
  },

  // ── Lecturas ────────────────────────────────────────────────────────────
  list: (filters: AppointmentFilters = {}, order: "asc" | "desc" = "asc") =>
    appointmentRepository.list(filters, order),

  listByPatient: (patientId: string, order: "asc" | "desc" = "asc") =>
    appointmentRepository.listByPatient(patientId, order),

  async getById(id: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("El turno");
    return appointment;
  },

  // ── Reserva (paciente) y alta manual (admin) ──────────────────────────────
  /**
   * Crea un turno validando reglas de negocio de forma transaccional para
   * evitar solapamientos por condiciones de carrera.
   */
  async book(params: {
    patientId: string;
    professionalId: string;
    serviceId: string;
    startsAtISO: string;
    notes?: string | null;
    status?: AppointmentStatus;
  }) {
    const { patientId, professionalId, serviceId, startsAtISO } = params;

    const [professional, service] = await Promise.all([
      professionalRepository.findById(professionalId),
      serviceRepository.findById(serviceId),
    ]);
    if (!professional || !professional.active) {
      throw new BusinessError("El profesional no está disponible.");
    }
    if (!service || !service.active) {
      throw new BusinessError("El servicio no está disponible.");
    }

    const startsAt = new Date(startsAtISO);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BusinessError("Horario inválido.");
    }
    const endsAt = addMinutes(startsAt, service.durationMinutes);

    // Debe ser a futuro (con antelación mínima).
    const minStart = addMinutes(new Date(), BOOKING_MIN_LEAD_HOURS * 60);
    if (isBefore(startsAt, minStart)) {
      throw new BusinessError(
        `Debés reservar con al menos ${BOOKING_MIN_LEAD_HOURS}h de antelación.`,
      );
    }

    // Debe caer dentro de una franja de disponibilidad de ese día.
    await assertWithinAvailability(professionalId, startsAt, endsAt);

    // Crear de forma atómica verificando solapamiento dentro de la transacción.
    try {
      const created = await appointmentRepository.client.$transaction(
        async (tx) => {
          const conflict = await tx.appointment.findFirst({
            where: {
              professionalId,
              status: { in: ACTIVE_STATUSES },
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
            select: { id: true },
          });
          if (conflict) {
            throw new BusinessError(
              "Ese horario ya fue reservado. Elegí otro, por favor.",
            );
          }

          return tx.appointment.create({
            data: {
              patientId,
              professionalId,
              serviceId,
              startsAt,
              endsAt,
              status: params.status ?? APPOINTMENT_STATUS.PENDING,
              notes: params.notes ? params.notes : null,
            },
          });
        },
      );

      logger.info("Turno creado", {
        appointmentId: created.id,
        professionalId,
        patientId,
      });
      return created;
    } catch (error) {
      if (error instanceof BusinessError) throw error;
      logger.error("Error al crear turno", { error: String(error) });
      throw new BusinessError("No se pudo crear el turno. Intentá nuevamente.");
    }
  },

  // ── Cambios de estado (admin) ─────────────────────────────────────────────
  async updateStatus(id: string, nextStatus: AppointmentStatus) {
    const appointment = await this.getById(id);
    const current = appointment.status as AppointmentStatus;

    if (current === nextStatus) return appointment;

    if (!ALLOWED_TRANSITIONS[current].includes(nextStatus)) {
      throw new BusinessError(
        `No se puede pasar de "${current}" a "${nextStatus}".`,
      );
    }

    const data =
      nextStatus === APPOINTMENT_STATUS.CANCELLED
        ? { status: nextStatus, cancelledAt: new Date() }
        : { status: nextStatus };

    return appointmentRepository.update(id, data);
  },

  // ── Cancelación (paciente o admin) ────────────────────────────────────────
  async cancel(params: {
    id: string;
    actorId: string;
    actorRole: Role;
    reason?: string | null;
  }) {
    const appointment = await this.getById(params.id);

    // Un paciente solo puede cancelar sus propios turnos.
    if (
      params.actorRole === ROLES.PATIENT &&
      appointment.patientId !== params.actorId
    ) {
      throw new BusinessError("No podés cancelar este turno.");
    }

    if (
      appointment.status === APPOINTMENT_STATUS.CANCELLED ||
      appointment.status === APPOINTMENT_STATUS.COMPLETED
    ) {
      throw new BusinessError("Este turno ya no puede cancelarse.");
    }

    // Ventana mínima de cancelación: solo aplica a pacientes.
    if (params.actorRole === ROLES.PATIENT) {
      const limit = addMinutes(new Date(), CANCELLATION_MIN_HOURS * 60);
      if (isBefore(appointment.startsAt, limit)) {
        throw new BusinessError(
          `Solo podés cancelar con al menos ${CANCELLATION_MIN_HOURS}h de antelación. Contactá a la consultoría.`,
        );
      }
    }

    const updated = await appointmentRepository.update(params.id, {
      status: APPOINTMENT_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: params.actorId,
      notes: params.reason ? params.reason : appointment.notes,
    });

    logger.info("Turno cancelado", {
      appointmentId: params.id,
      actorRole: params.actorRole,
    });
    return updated;
  },
};

/**
 * Verifica que el intervalo [startsAt, endsAt) caiga completo dentro de alguna
 * franja de disponibilidad del profesional ese día de la semana.
 */
async function assertWithinAvailability(
  professionalId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<void> {
  // Día de la semana en la zona de la consultoría.
  const day = parseLocalDateKey(toLocalDateKey(startsAt));
  const dayOfWeek = day.getDay();

  const windows = await availabilityRepository.listByProfessionalAndDay(
    professionalId,
    dayOfWeek,
  );
  if (windows.length === 0) {
    throw new BusinessError("El profesional no atiende ese día.");
  }

  // Minutos desde la medianoche local de la consultoría.
  const startZoned = utcToZoned(startsAt);
  const endZoned = utcToZoned(endsAt);
  const startMinutes = startZoned.getHours() * 60 + startZoned.getMinutes();
  const endMinutes = endZoned.getHours() * 60 + endZoned.getMinutes();

  const fits = windows.some((window) => {
    const ws = timeToMinutes(window.startTime);
    const we = timeToMinutes(window.endTime);
    return startMinutes >= ws && endMinutes <= we;
  });

  if (!fits) {
    throw new BusinessError(
      "El horario elegido está fuera de la disponibilidad del profesional.",
    );
  }
}
