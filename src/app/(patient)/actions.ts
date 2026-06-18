"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, fromError, ok } from "@/lib/action-result";
import { assertAuthenticated, assertRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import {
  bookSlotSchema,
  cancelBookingSchema,
} from "@/lib/validations/booking";
import { profileSchema } from "@/lib/validations/auth";
import { emitEvent } from "@/server/events/emitter";
import { bookingService } from "@/server/services/booking.service";
import { userRepository } from "@/server/repositories/user.repository";
import { type ActionResult } from "@/types";

export async function bookSlotAction(input: unknown): Promise<ActionResult> {
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

    const booking = await bookingService.book({
      slotId: data.slotId,
      userId: user.id,
      notes: data.notes || null,
    });

    // Evento appointment.confirmed para automatización externa (n8n manda el
    // mail). Se emite DESPUÉS de responderle al socio con `after()`: no bloquea
    // su respuesta y su fallo nunca afecta la reserva ya confirmada.
    if (booking.bookingId) {
      const bookingId = booking.bookingId;
      after(() =>
        emitEvent(
          "appointment.confirmed",
          {
            booking: {
              id: bookingId,
              date: booking.date,
              startTime: booking.startTime,
              endTime: booking.endTime,
            },
            service: "entrenamiento",
            patient: { name: user.name, email: user.email },
          },
          `${bookingId}:appointment.confirmed`,
        ),
      );
    }

    revalidatePath("/portal");
    revalidatePath("/portal/reservar");
    revalidatePath("/portal/turnos");
    return ok(undefined);
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
