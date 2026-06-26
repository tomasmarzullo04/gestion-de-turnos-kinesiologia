import { z } from "zod";

/** Edición completa del paciente (datos personales + cobertura). */
export const editPatientSchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre").max(120, "Nombre demasiado largo"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  phone: z
    .string()
    .trim()
    .max(40, "Teléfono demasiado largo")
    .optional()
    .or(z.literal(""))
    .nullable(),
  tipoCoberturaString: z
    .enum(["OBRA_SOCIAL", "PARTICULAR"], {
      errorMap: () => ({ message: "Seleccioná un tipo de cobertura" }),
    })
    .optional()
    .nullable(),
  obraSocialNombre: z
    .string()
    .max(120, "El nombre de la obra social es demasiado largo")
    .trim()
    .optional()
    .or(z.literal(""))
    .nullable(),
  requiereCopago: z.boolean().optional(),
  sesionesTotales: z
    .number({ invalid_type_error: "Ingresá un número" })
    .int("Debe ser un número entero")
    .min(0, "Mínimo 0")
    .max(999, "Máximo 999")
    .optional(),
  esPrimeraVez: z.boolean().optional(),
});

export type EditPatientInput = z.infer<typeof editPatientSchema>;

/** Validación para editar datos del paciente (cobertura y tratamiento). */
export const patientSchema = z.object({
  tipoCoberturaString: z
    .enum(["OBRA_SOCIAL", "PARTICULAR"], {
      errorMap: () => ({ message: "Seleccioná un tipo de cobertura" }),
    })
    .optional()
    .nullable(),
  obraSocialNombre: z
    .string()
    .max(120, "El nombre de la obra social es demasiado largo")
    .trim()
    .optional()
    .or(z.literal(""))
    .nullable(),
  requiereCopago: z.boolean().optional(),
  sesionesTotales: z
    .number({ invalid_type_error: "Ingresá un número" })
    .int("Debe ser un número entero")
    .min(0, "Mínimo 0")
    .max(999, "Máximo 999")
    .optional(),
  esPrimeraVez: z.boolean().optional(),
});

export type PatientInput = z.infer<typeof patientSchema>;
