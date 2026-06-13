import { z } from "zod";

export const serviceSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre es demasiado largo")
    .trim(),
  description: z
    .string()
    .max(500, "La descripción es demasiado larga")
    .trim()
    .optional()
    .or(z.literal("")),
  durationMinutes: z
    .number({ invalid_type_error: "Ingresá una duración válida" })
    .int("Debe ser un número entero")
    .min(5, "La duración mínima es 5 minutos")
    .max(480, "La duración máxima es 8 horas"),
  active: z.boolean(),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
