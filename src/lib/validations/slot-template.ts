import { z } from "zod";

import { timeToMinutes } from "@/lib/datetime";

const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:mm)");

export const slotTemplateSchema = z
  .object({
    professionalId: z.string().uuid().nullable().optional(),
    serviceId: z.string().uuid().nullable().optional(),
    daysOfWeek: z
      .array(z.number().int().min(0).max(6), {
        invalid_type_error: "Seleccioná al menos un día",
      })
      .min(1, "Seleccioná al menos un día"),
    startTime: timeField,
    endTime: timeField,
    capacity: z
      .number({ invalid_type_error: "Ingresá una capacidad" })
      .int("Debe ser un número entero")
      .min(1, "La capacidad mínima es 1")
      .max(1000, "Capacidad demasiado alta"),
  })
  .refine((d) => timeToMinutes(d.startTime) < timeToMinutes(d.endTime), {
    message: "El fin debe ser posterior al inicio",
    path: ["endTime"],
  });

export type SlotTemplateInput = z.infer<typeof slotTemplateSchema>;
