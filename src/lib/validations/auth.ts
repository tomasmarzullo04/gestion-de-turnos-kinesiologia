import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede superar los 72 caracteres")
  .regex(/[a-z]/, "Debe incluir al menos una minúscula")
  .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número");

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Email inválido")
    .toLowerCase()
    .trim(),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre es demasiado largo")
      .trim(),
    email: z
      .string()
      .min(1, "El email es obligatorio")
      .email("Email inválido")
      .toLowerCase()
      .trim(),
    phone: z
      .string()
      .max(30, "Teléfono demasiado largo")
      .trim()
      .optional()
      .or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmá la contraseña"),
    tipoCobertura: z.enum(["OBRA_SOCIAL", "PARTICULAR"]),
    obraSocialNombre: z.string().optional(),
    requiereCopago: z.boolean().default(false),
    montoCopago: z.number().min(0, "Monto inválido").optional().nullable(),
    esPrimeraVez: z.boolean().default(true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.tipoCobertura === "OBRA_SOCIAL") {
        return !!data.obraSocialNombre && data.obraSocialNombre.trim().length > 0;
      }
      return true;
    },
    {
      message: "Ingresá el nombre de la obra social",
      path: ["obraSocialNombre"],
    }
  )
  .refine(
    (data) => {
      if (data.requiereCopago) {
        return data.montoCopago !== undefined && data.montoCopago !== null && data.montoCopago > 0;
      }
      return true;
    },
    {
      message: "Ingresá el monto de copago",
      path: ["montoCopago"],
    }
  );

export const profileSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre es demasiado largo")
    .trim(),
  phone: z
    .string()
    .max(30, "Teléfono demasiado largo")
    .trim()
    .optional()
    .or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
