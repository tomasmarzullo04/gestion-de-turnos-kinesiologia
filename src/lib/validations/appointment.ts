import { z } from "zod";

import { APPOINTMENT_STATUS_VALUES } from "@/lib/constants";

/** Reserva hecha por un paciente: elige profesional, servicio y un slot (ISO). */
export const bookAppointmentSchema = z.object({
  professionalId: z.string().min(1, "Seleccioná un profesional"),
  serviceId: z.string().min(1, "Seleccioná un servicio"),
  startsAt: z
    .string()
    .datetime({ message: "Horario inválido" }),
  notes: z
    .string()
    .max(500, "Las notas son demasiado largas")
    .trim()
    .optional()
    .or(z.literal("")),
});

/** Creación manual por el admin: igual que la reserva pero indicando el paciente. */
export const adminCreateAppointmentSchema = bookAppointmentSchema.extend({
  patientId: z.string().min(1, "Seleccioná un paciente"),
});

export const updateStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(APPOINTMENT_STATUS_VALUES),
});

/** Consulta de slots disponibles para un día concreto. */
export const slotsQuerySchema = z.object({
  professionalId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

export const cancelAppointmentSchema = z.object({
  id: z.string().min(1),
  reason: z.string().max(300).trim().optional().or(z.literal("")),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
export type AdminCreateAppointmentInput = z.infer<
  typeof adminCreateAppointmentSchema
>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type SlotsQueryInput = z.infer<typeof slotsQuerySchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
