"use server";

import { revalidatePath } from "next/cache";

import { fail, fromError, ok } from "@/lib/action-result";
import { assertRole } from "@/lib/auth/session";
import { ROLES, type AppointmentStatus } from "@/lib/constants";
import {
  adminCreateAppointmentSchema,
  cancelAppointmentSchema,
  updateStatusSchema,
} from "@/lib/validations/appointment";
import { availabilitySchema } from "@/lib/validations/availability";
import { professionalSchema } from "@/lib/validations/professional";
import { serviceSchema } from "@/lib/validations/service";
import { appointmentService } from "@/server/services/appointment.service";
import { availabilityService } from "@/server/services/availability.service";
import { professionalService } from "@/server/services/professional.service";
import { serviceService } from "@/server/services/service.service";
import { type ActionResult } from "@/types";

// ── Servicios ────────────────────────────────────────────────────────────
export async function createServiceAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = serviceSchema.parse(input);
    await serviceService.create(data);
    revalidatePath("/admin/servicios");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function updateServiceAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = serviceSchema.parse(input);
    await serviceService.update(id, data);
    revalidatePath("/admin/servicios");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function toggleServiceActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    await serviceService.setActive(id, active);
    revalidatePath("/admin/servicios");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    await serviceService.remove(id);
    revalidatePath("/admin/servicios");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

// ── Profesionales ──────────────────────────────────────────────────────────
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

export async function deleteProfessionalAction(
  id: string,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    await professionalService.remove(id);
    revalidatePath("/admin/profesionales");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

// ── Disponibilidad ──────────────────────────────────────────────────────────
export async function createAvailabilityAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = availabilitySchema.parse(input);
    await availabilityService.create(data);
    revalidatePath("/admin/disponibilidad");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function deleteAvailabilityAction(
  id: string,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    await availabilityService.remove(id);
    revalidatePath("/admin/disponibilidad");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

// ── Turnos ────────────────────────────────────────────────────────────────
export async function createAppointmentAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const data = adminCreateAppointmentSchema.parse(input);
    await appointmentService.book({
      patientId: data.patientId,
      professionalId: data.professionalId,
      serviceId: data.serviceId,
      startsAtISO: data.startsAt,
      notes: data.notes || null,
      // El admin crea turnos ya confirmados.
      status: "CONFIRMED",
    });
    revalidatePath("/admin");
    revalidatePath("/admin/turnos");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function updateAppointmentStatusAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await assertRole(ROLES.ADMIN);
    const { id, status } = updateStatusSchema.parse(input);
    await appointmentService.updateStatus(id, status as AppointmentStatus);
    revalidatePath("/admin");
    revalidatePath("/admin/turnos");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}

export async function cancelAppointmentAdminAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const admin = await assertRole(ROLES.ADMIN);
    const { id, reason } = cancelAppointmentSchema.parse(input);
    await appointmentService.cancel({
      id,
      actorId: admin.id,
      actorRole: ROLES.ADMIN,
      reason: reason || null,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/turnos");
    return ok(undefined);
  } catch (error) {
    return fromError(error);
  }
}
