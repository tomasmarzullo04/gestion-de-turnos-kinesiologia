import { z } from "zod";

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

const monthField = z.number().int().min(1).max(12);
const yearField = z.number().int().min(2000).max(2100);

const amount = z
  .number({ invalid_type_error: "Ingresá un monto" })
  .int("El monto debe ser un número entero")
  .min(0, "El monto no puede ser negativo")
  .max(100_000_000, "Monto demasiado alto");

/** Registrar uno o varios copagos de un paciente para un período (mes/año). */
export const registerCopagoSchema = z.object({
  userId: z.string().min(1, "Paciente inválido"),
  quantity: z
    .number({ invalid_type_error: "Ingresá una cantidad" })
    .int("Cantidad inválida")
    .min(1, "Al menos un copago")
    .max(60, "Cantidad demasiado alta"),
  unitAmount: amount,
  periodMonth: monthField,
  periodYear: yearField,
  paidAt: dateField,
});

/** Registrar un cobro extra puntual. */
export const registerExtraSchema = z.object({
  userId: z.string().min(1, "Paciente inválido"),
  amount: amount.refine((n) => n > 0, "El monto debe ser mayor a 0"),
  concept: z
    .string()
    .trim()
    .min(1, "Ingresá un concepto")
    .max(200, "Concepto demasiado largo"),
  periodMonth: monthField,
  periodYear: yearField,
  paidAt: dateField,
});

/** Anular un pago (queda registro, no se borra). */
export const voidPaymentSchema = z.object({
  paymentId: z.string().uuid("Pago inválido"),
  reason: z.string().trim().max(200, "Motivo demasiado largo").optional(),
});

/** Actualizar el monto vigente del copago. */
export const updateCopagoAmountSchema = z.object({
  amount: amount,
});

export type RegisterCopagoInput = z.infer<typeof registerCopagoSchema>;
export type RegisterExtraInput = z.infer<typeof registerExtraSchema>;
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;
export type UpdateCopagoAmountInput = z.infer<typeof updateCopagoAmountSchema>;
