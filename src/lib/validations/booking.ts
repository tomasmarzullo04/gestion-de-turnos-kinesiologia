import { z } from "zod";

/** Reserva de una franja por su id (uuid). Requiere servicio seleccionado. */
export const bookSlotSchema = z.object({
  slotId: z.string().uuid("Franja inválida"),
  serviceId: z.string().uuid("Servicio inválido"),
  notes: z
    .string()
    .max(500, "Las notas son demasiado largas")
    .trim()
    .optional()
    .or(z.literal("")),
});

/** Cancelación de una reserva por su id (uuid). */
export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid("Reserva inválida"),
});

/** Turno fijo (serie recurrente): servicio + días + horario + hasta una fecha. */
export const bookSeriesSchema = z.object({
  serviceId: z.string().uuid("Servicio inválido"),
  daysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Elegí al menos un día"),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horario inválido"),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  notes: z
    .string()
    .max(500, "Las notas son demasiado largas")
    .trim()
    .optional()
    .or(z.literal("")),
});

/** Cancelar toda una serie de turnos fijos. */
export const cancelSeriesSchema = z.object({
  recurrenceId: z.string().uuid("Serie inválida"),
});

export type BookSlotInput = z.infer<typeof bookSlotSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type BookSeriesInput = z.infer<typeof bookSeriesSchema>;
export type CancelSeriesInput = z.infer<typeof cancelSeriesSchema>;
