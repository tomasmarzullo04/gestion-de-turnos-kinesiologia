"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, fromError, ok } from "@/lib/action-result";
import { assertAuthenticated, assertRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import {
  bookSeriesSchema,
  bookSlotSchema,
  cancelBookingSchema,
  cancelSeriesSchema,
} from "@/lib/validations/booking";
import { profileSchema } from "@/lib/validations/auth";
import { onboardingSchema } from "@/lib/validations/admin-booking";
import { emitEvent } from "@/server/events/emitter";
import {
  bookingService,
  type SeriesResult,
} from "@/server/services/booking.service";
import { patientService } from "@/server/services/patient.service";
import { serviceService } from "@/server/services/service.service";
import { userRepository } from "@/server/repositories/user.repository";
import { type ActionResult } from "@/types";

export async function bookSlotAction(input: unknown): Promise<ActionResult<{ isFirstTime?: boolean }>> {
  try {
    const user = await assertRole(ROLES.PATIENT);
    const data = bookSlotSchema.parse(input);

    // Rate limit: máx. 10 reservas por hora por paciente.
    const limit = rateLimit(`book:${user.id}`, 10, 60 * 60 * 1000);
    if (!limit.success) {
      return fail(
        `Demasiadas reservas seguidas. Reintentá en ${limit.retryAfter}s.`,
      );
    }

    // Cuenta archivada (baja lógica): no puede reservar.
    if (await patientService.isArchived(user.id)) {
      return fail("Tu cuenta está inactiva. Contactá a recepción.");
    }

    // Obtener estado de primera vez del paciente
    const profile = await patientService.getPatientProfile(user.id);
    const esPrimeraVez = profile?.esPrimeraVez ?? false;

    const booking = await bookingService.book({
      slotId: data.slotId,
      userId: user.id,
      serviceId: data.serviceId,
      notes: data.notes || null,
      esPrimeraVez,
    });

    // Evento appointment.confirmed para automatización externa (n8n manda el
    // mail). Se emite DESPUÉS de responderle al socio con `after()`: no bloquea
    // su respuesta y su fallo nunca afecta la reserva ya confirmada.
    if (booking.bookingId) {
      const bookingId = booking.bookingId;
      after(async () => {
        // Resolvemos el servicio a su NOMBRE legible (el que ve el paciente)
        // para que el mail de confirmación lo muestre. Mandamos { id, name }:
        // se conserva el id por si algún consumidor lo necesita.
        const service = await serviceService.findById(data.serviceId);
        await emitEvent(
          "appointment.confirmed",
          {
            booking: {
              id: bookingId,
              date: booking.date,
              startTime: booking.startTime,
              endTime: booking.endTime,
            },
            service: {
              id: data.serviceId,
              name: service?.name ?? null,
            },
            patient: { name: user.name, email: user.email },
            isFirstTime: booking.isFirstTime,
          },
          `${bookingId}:appointment.confirmed`,
        );
      });
    }

    revalidatePath("/portal");
    revalidatePath("/portal/reservar");
    revalidatePath("/portal/turnos");

    // Devolver info de primera vez para el toast especial en el cliente
    return ok({
      isFirstTime: booking.isFirstTime,
    });
  } catch (error) {
    return fromError(error);
  }
}

export async function cancelBookingAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await assertRole(ROLES.PATIENT);
    const { bookingId } = cancelBookingSchema.parse(input);

    await bookingService.cancel({
      bookingId,
      userId: user.id,
      role: ROLES.PATIENT,
    });

    revalidatePath("/portal");
    revalidatePath("/portal/turnos");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

/** Turno fijo (serie recurrente): reserva una franja por cada fecha del rango. */
export async function bookSeriesAction(
  input: unknown,
): Promise<ActionResult<SeriesResult>> {
  try {
    const user = await assertRole(ROLES.PATIENT);

    if (await patientService.isArchived(user.id)) {
      return fail("Tu cuenta está inactiva. Contactá a recepción.");
    }

    // Rate limit: pocas series por hora (cada una genera muchas reservas).
    const limit = rateLimit(`series:${user.id}`, 3, 60 * 60 * 1000);
    if (!limit.success) {
      return fail(`Demasiadas series seguidas. Reintentá en ${limit.retryAfter}s.`);
    }

    const data = bookSeriesSchema.parse(input);
    const result = await bookingService.bookSeries({
      userId: user.id,
      serviceId: data.serviceId,
      daysOfWeek: data.daysOfWeek,
      startTime: data.startTime,
      toDate: data.toDate,
      notes: data.notes || null,
    });

    revalidatePath("/portal");
    revalidatePath("/portal/reservar");
    revalidatePath("/portal/turnos");
    return ok(result);
  } catch (error) {
    return fromError(error);
  }
}

/** Horarios de inicio disponibles para un servicio (para armar el turno fijo). */
export async function getServiceStartTimesAction(
  serviceId: string,
): Promise<ActionResult<string[]>> {
  try {
    await assertRole(ROLES.PATIENT);
    const times = await bookingService.getServiceStartTimes(serviceId);
    return ok(times);
  } catch (error) {
    return fromError(error);
  }
}

/** Cancela toda una serie (turnos futuros; los pasados no se tocan). */
export async function cancelSeriesAction(
  input: unknown,
): Promise<ActionResult<{ cancelled: number }>> {
  try {
    const user = await assertRole(ROLES.PATIENT);
    const { recurrenceId } = cancelSeriesSchema.parse(input);
    const cancelled = await bookingService.cancelSeries({
      recurrenceId,
      userId: user.id,
    });
    revalidatePath("/portal");
    revalidatePath("/portal/turnos");
    return ok({ cancelled });
  } catch (error) {
    return fromError(error);
  }
}

/** Onboarding del paciente: define su contraseña y completa/corrige sus datos. */
export async function completeOnboardingAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await assertRole(ROLES.PATIENT);
    const data = onboardingSchema.parse(input);
    await patientService.completeOnboarding(user.id, {
      name: data.name,
      phone: data.phone || null,
      tipoCoberturaString: data.tipoCoberturaString,
      obraSocialNombre: data.obraSocialNombre || null,
      password: data.password,
    });
    revalidatePath("/portal");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function updateProfileAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await assertAuthenticated();
    const data = profileSchema.parse(input);

    await userRepository.update(user.id, {
      name: data.name,
      phone: data.phone ? data.phone : null,
    });

    revalidatePath("/portal/perfil");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}
