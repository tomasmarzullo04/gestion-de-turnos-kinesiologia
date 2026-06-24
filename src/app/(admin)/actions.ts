"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fromError, ok } from "@/lib/action-result";
import { assertRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";
import { markAttendanceSchema } from "@/lib/validations/attendance";
import { professionalSchema } from "@/lib/validations/professional";
import { slotTemplateSchema } from "@/lib/validations/slot-template";
import { patientSchema } from "@/lib/validations/patient";
import { attendanceService } from "@/server/services/attendance.service";
import { bookingService, type MyBooking } from "@/server/services/booking.service";
import {
  generationService,
  type SyncConflict,
} from "@/server/services/generation.service";
import { patientService } from "@/server/services/patient.service";
import { professionalService } from "@/server/services/professional.service";
import { slotService } from "@/server/services/slot.service";
import { slotTemplateService } from "@/server/services/slot-template.service";
import { type ActionResult } from "@/types";

// ── Plantillas (única fuente de verdad: cada cambio re-sincroniza las franjas) ──
/**
 * Materializa/actualiza/limpia las franjas futuras según las plantillas activas
 * y revalida. Devuelve los conflictos (franjas con reservas que quedaron
 * huérfanas o por debajo de capacidad) para avisarlos en la UI.
 */
async function syncTemplatesAndRevalidate(): Promise<SyncConflict[]> {
  const sync = await generationService.syncFutureSlots();
  revalidatePath("/admin/plantillas");
  revalidatePath("/admin");
  revalidatePath("/portal/reservar");
  return sync.conflicts;
}

export async function createTemplateAction(
  input: unknown,
): Promise<ActionResult<SyncConflict[]>> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = slotTemplateSchema.parse(input);
    await slotTemplateService.create(data);
    return ok(await syncTemplatesAndRevalidate());
  } catch (error) {
    return fromError(error);
  }
}

export async function updateTemplateAction(
  id: string,
  input: unknown,
): Promise<ActionResult<SyncConflict[]>> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = slotTemplateSchema.parse(input);
    await slotTemplateService.update(id, data);
    return ok(await syncTemplatesAndRevalidate());
  } catch (error) {
    return fromError(error);
  }
}

export async function toggleTemplateActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult<SyncConflict[]>> {
  try {
    await assertRole(ROLES.ADMIN);
    await slotTemplateService.setActive(id, active);
    return ok(await syncTemplatesAndRevalidate());
  } catch (error) {
    return fromError(error);
  }
}

export async function deleteTemplateAction(
  id: string,
): Promise<ActionResult<SyncConflict[]>> {
  try {
    await assertRole(ROLES.ADMIN);
    await slotTemplateService.remove(id);
    return ok(await syncTemplatesAndRevalidate());
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
