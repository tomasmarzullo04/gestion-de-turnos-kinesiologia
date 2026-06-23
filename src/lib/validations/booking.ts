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

export type BookSlotInput = z.infer<typeof bookSlotSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
