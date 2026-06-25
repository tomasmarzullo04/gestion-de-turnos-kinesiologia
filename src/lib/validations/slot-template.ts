import { z } from "zod";

import { timeToMinutes } from "@/lib/datetime";

const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:mm)");

const rangeSchema = z
  .object({
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

export const slotTemplateSchema = z
  .object({
    professionalId: z.string().uuid().nullable().optional(),
    // El servicio es obligatorio: toda plantilla pertenece a un servicio. Así
    // no se vuelve a generar el grupo residual "Sin servicio".
    serviceId: z.string().uuid("Seleccioná un servicio"),
    daysOfWeek: z
      .array(z.number().int().min(0).max(6), {
        invalid_type_error: "Seleccioná al menos un día",
      })
      .min(1, "Seleccioná al menos un día"),
    ranges: z.array(rangeSchema).min(1, "Agregá al menos una franja horaria"),
  })
  .superRefine((data, ctx) => {
    // Check for overlaps
    const sorted = [...data.ranges].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      
      if (current && next && timeToMinutes(current.endTime) > timeToMinutes(next.startTime)) {
        const originalIndex = data.ranges.findIndex(r => r === next);
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Esta franja se superpone con otra",
          path: ["ranges", originalIndex, "startTime"],
        });
      }
    }
  });

export type SlotTemplateInput = z.infer<typeof slotTemplateSchema>;
