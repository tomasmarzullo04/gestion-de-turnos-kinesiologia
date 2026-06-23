import { z } from "zod";

export const professionalSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre es demasiado largo")
    .trim(),
  specialty: z
    .string()
    .max(120, "La especialidad es demasiado larga")
    .trim()
    .optional()
    .or(z.literal("")),
  active: z.boolean(),
  serviceIds: z.array(z.string().uuid()).optional().default([]),
});

export type ProfessionalInput = z.infer<typeof professionalSchema>;
