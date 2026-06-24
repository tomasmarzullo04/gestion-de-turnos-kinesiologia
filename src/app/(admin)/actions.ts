"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { fromError, ok } from "@/lib/action-result";
import { assertRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { markAttendanceSchema } from "@/lib/validations/attendance";
import { professionalSchema } from "@/lib/validations/professional";
import { slotTemplateSchema } from "@/lib/validations/slot-template";
import { patientSchema } from "@/lib/validations/patient";
import { attendanceService } from "@/server/services/attendance.service";
import { bookingService, type MyBooking } from "@/server/services/booking.service";
import { generationService } from "@/server/services/generation.service";
import { patientService } from "@/server/services/patient.service";
import { professionalService } from "@/server/services/professional.service";
import { slotService } from "@/server/services/slot.service";
import { slotTemplateService } from "@/server/services/slot-template.service";
import { type ActionResult } from "@/types";

// ── Plantillas (única fuente de verdad: cada cambio re-sincroniza las franjas) ──
/**
 * Tras un cambio de plantilla: revalida la vista del profesional al instante y
 * materializa/sincroniza las franjas futuras en segundo plano con `after()`.
 *
 * Así el botón ("Guardando…"/"Eliminando…") responde de inmediato sin esperar a
 * la generación de los próximos 30 días, mientras la disponibilidad del socio
 * queda actualizada apenas termina el sync — con los cupos EXACTOS configurados
 * en la plantilla (única fuente de verdad; sin reglas preestablecidas). El sync
 * nunca toca franjas con reservas, así que correrlo en segundo plano es seguro.
 */
function publishTemplateChange(): void {
  revalidatePath("/admin/plantillas");
  after(async () => {
    try {
      await generationService.syncFutureSlots();
      revalidatePath("/portal/reservar");
      revalidatePath("/admin");
    } catch (error) {
      logger.error("Sync de franjas falló tras cambio de plantilla", { error });
    }
  });
}

export async function createTemplateAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    console.log("createTemplateAction input:", input);
    const data = slotTemplateSchema.parse(input);
    console.log("createTemplateAction parsed data:", data);
    await slotTemplateService.create(data);
    publishTemplateChange();
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function updateTemplateGroupAction(
  oldDayOfWeek: number,
  oldServiceId: string | null,
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = slotTemplateSchema.parse(input);
    await slotTemplateService.updateGroup(oldDayOfWeek, oldServiceId, data);
    publishTemplateChange();
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function toggleTemplateGroupActiveAction(
  dayOfWeek: number,
  serviceId: string | null,
  active: boolean,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    await slotTemplateService.setActiveGroup(dayOfWeek, serviceId, active);
    publishTemplateChange();
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function deleteTemplateGroupAction(
  dayOfWeek: number,
  serviceId: string | null,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    await slotTemplateService.removeGroup(dayOfWeek, serviceId);
    publishTemplateChange();
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

// ── Franjas (bloquear / desbloquear) — usado desde Asistencias ─────────────
const blockSchema = z.object({
  slotId: z.string().uuid(),
  blocked: z.boolean(),
});

export async function toggleSlotBlockedAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const { slotId, blocked } = blockSchema.parse(input);
    await slotService.setBlocked(slotId, blocked);
    revalidatePath("/admin/asistencias");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

// ── Reservas (cancelar como admin) — usado desde Asistencias ───────────────
const adminCancelSchema = z.object({ bookingId: z.string().uuid() });

export async function adminCancelBookingAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const { bookingId } = adminCancelSchema.parse(input);
    await bookingService.adminCancel(bookingId);
    revalidatePath("/admin/asistencias");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

// ── Profesionales (ABM) ─────────────────────────────────────────────────────
export async function createProfessionalAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = professionalSchema.parse(input);
    await professionalService.create(data);
    revalidatePath("/admin/profesionales");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function updateProfessionalAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = professionalSchema.parse(input);
    await professionalService.update(id, data);
    revalidatePath("/admin/profesionales");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function toggleProfessionalActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    await professionalService.setActive(id, active);
    revalidatePath("/admin/profesionales");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

// ── Pacientes ───────────────────────────────────────────────────────────────
export async function getPatientBookingsAction(
  userId: string,
): Promise<ActionResult<MyBooking[]>> {
  try {
    await assertRole(ROLES.ADMIN);
    const bookings = await bookingService.listForUser(userId);
    return ok(bookings);
  } catch (error) {
    return fromError(error);
  }
}

export async function updatePatientAction(
  userId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = patientSchema.parse(input);
    await patientService.updatePatientInfo(userId, data);
    revalidatePath("/admin/pacientes");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

// ── Asistencias ─────────────────────────────────────────────────────────────
export async function markAttendanceAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const professional = await assertRole(ROLES.ADMIN);
    const { bookingId, status } = markAttendanceSchema.parse(input);
    await attendanceService.mark(bookingId, status, professional.id);
    revalidatePath("/admin/asistencias");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}
