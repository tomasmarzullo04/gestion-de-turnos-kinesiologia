"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fromError, ok } from "@/lib/action-result";
import { assertRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";
import { slotTemplateSchema } from "@/lib/validations/slot-template";
import { bookingService } from "@/server/services/booking.service";
import { generationService } from "@/server/services/generation.service";
import { slotService } from "@/server/services/slot.service";
import { slotTemplateService } from "@/server/services/slot-template.service";
import { type ActionResult } from "@/types";

// ── Plantillas ───────────────────────────────────────────────────────────
export async function createTemplateAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = slotTemplateSchema.parse(input);
    await slotTemplateService.create(data);
    revalidatePath("/admin/plantillas");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function updateTemplateAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = slotTemplateSchema.parse(input);
    await slotTemplateService.update(id, data);
    revalidatePath("/admin/plantillas");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function toggleTemplateActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    await slotTemplateService.setActive(id, active);
    revalidatePath("/admin/plantillas");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    await slotTemplateService.remove(id);
    revalidatePath("/admin/plantillas");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

// ── Generación de agenda ───────────────────────────────────────────────────
export async function generateAgendaAction(): Promise<ActionResult<number>> {
  try {
    await assertRole(ROLES.ADMIN);
    const created = await generationService.generateAgenda();
    revalidatePath("/admin/agenda");
    revalidatePath("/admin");
    return ok(created);
  } catch (error) {
    return fromError(error);
  }
}

// ── Franjas (bloquear / desbloquear) ───────────────────────────────────────
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
    revalidatePath("/admin/agenda");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

// ── Reservas (cancelar como admin) ─────────────────────────────────────────
const adminCancelSchema = z.object({ bookingId: z.string().uuid() });

export async function adminCancelBookingAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const { bookingId } = adminCancelSchema.parse(input);
    await bookingService.adminCancel(bookingId);
    revalidatePath("/admin/agenda");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}
