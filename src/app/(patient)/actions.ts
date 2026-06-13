"use server";

import { revalidatePath } from "next/cache";

import { fail, fromError, ok } from "@/lib/action-result";
import { assertAuthenticated, assertRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
} from "@/lib/validations/appointment";
import { profileSchema } from "@/lib/validations/auth";
import { appointmentService } from "@/server/services/appointment.service";
import { userRepository } from "@/server/repositories/user.repository";
import { type ActionResult } from "@/types";

export async function bookAppointmentAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await assertRole(ROLES.PATIENT);
    const data = bookAppointmentSchema.parse(input);

    // Rate limit: máx. 10 reservas por hora por paciente.
    const limit = rateLimit(`book:${user.id}`, 10, 60 * 60 * 1000);
    if (!limit.success) {
      return fail(
        `Demasiadas reservas seguidas. Reintentá en ${limit.retryAfter}s.`,
      );
    }

    await appointmentService.book({
      patientId: user.id,
      professionalId: data.professionalId,
      serviceId: data.serviceId,
      startsAtISO: data.startsAt,
      notes: data.notes || null,
    });

    revalidatePath("/portal");
    revalidatePath("/portal/turnos");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function cancelMyAppointmentAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await assertRole(ROLES.PATIENT);
    const { id, reason } = cancelAppointmentSchema.parse(input);

    await appointmentService.cancel({
      id,
      actorId: user.id,
      actorRole: ROLES.PATIENT,
      reason: reason || null,
    });

    revalidatePath("/portal");
    revalidatePath("/portal/turnos");
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
