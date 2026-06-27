import { z } from "zod";

import { passwordSchema } from "@/lib/validations/auth";

const coverage = z
  .enum(["OBRA_SOCIAL", "PARTICULAR"], {
    errorMap: () => ({ message: "Seleccioná un tipo de cobertura" }),
  })
  .optional()
  .nullable();

const obraSocial = z
  .string()
  .max(120, "Nombre demasiado largo")
  .trim()
  .optional()
  .or(z.literal(""))
  .nullable();

const phone = z
  .string()
  .max(40, "Teléfono demasiado largo")
  .trim()
  .optional()
  .or(z.literal(""))
  .nullable();

/** El profesional carga un turno a un paciente (con sobrecupo opcional). */
export const adminBookSchema = z.object({
  userId: z.string().min(1, "Paciente inválido"),
  slotId: z.string().uuid("Franja inválida"),
  override: z.boolean().default(false),
  notes: z
    .string()
    .max(500, "Las notas son demasiado largas")
    .trim()
    .optional()
    .or(z.literal("")),
});

/** El profesional da de alta un paciente nuevo (sin contraseña: se genera). */
export const createPatientSchema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre").max(120, "Nombre demasiado largo"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  phone,
  tipoCoberturaString: coverage,
  obraSocialNombre: obraSocial,
  requiereCopago: z.boolean().optional(),
});

/** Onboarding del paciente: define su contraseña y completa/corrige sus datos. */
export const onboardingSchema = z
  .object({
    name: z.string().trim().min(2, "Ingresá tu nombre").max(120, "Nombre demasiado largo"),
    phone: z
      .string()
      .max(40, "Teléfono demasiado largo")
      .trim()
      .optional()
      .or(z.literal("")),
    tipoCoberturaString: z
      .enum(["OBRA_SOCIAL", "PARTICULAR"], {
        errorMap: () => ({ message: "Seleccioná un tipo de cobertura" }),
      }),
    obraSocialNombre: z.string().trim().max(120).optional().or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmá la contraseña"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine(
    (d) =>
      d.tipoCoberturaString !== "OBRA_SOCIAL" ||
      (!!d.obraSocialNombre && d.obraSocialNombre.trim().length > 0),
    { message: "Ingresá el nombre de la obra social", path: ["obraSocialNombre"] },
  );

export type AdminBookInput = z.infer<typeof adminBookSchema>;
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
