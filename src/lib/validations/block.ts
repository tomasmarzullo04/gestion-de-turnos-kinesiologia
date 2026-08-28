import { z } from "zod";

/** Tipos de bloqueo. */
export const BLOCK_TYPES = {
  TOTAL: "TOTAL",
  FIRST_TIME: "FIRST_TIME",
} as const;

export type BlockType = (typeof BLOCK_TYPES)[keyof typeof BLOCK_TYPES];

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  TOTAL: "Total (nadie reserva)",
  FIRST_TIME: "Solo primerizos bloqueados",
};

/** Esquema para crear un bloqueo. */
export const createBlockSchema = z
  .object({
    serviceId: z.string().uuid().nullable(),
    blockType: z.enum(["TOTAL", "FIRST_TIME"]),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    timeFrom: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida")
      .nullable()
      .optional(),
    timeTo: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida")
      .nullable()
      .optional(),
    reason: z.string().max(200).optional(),
  })
  .refine((d) => d.dateFrom <= d.dateTo, {
    message: "La fecha de inicio no puede ser posterior a la fecha de fin",
    path: ["dateTo"],
  })
  .refine(
    (d) => {
      const hasFrom = d.timeFrom != null && d.timeFrom !== "";
      const hasTo = d.timeTo != null && d.timeTo !== "";
      return hasFrom === hasTo;
    },
    {
      message: "Debés completar ambos horarios o ninguno",
      path: ["timeTo"],
    },
  )
  .refine(
    (d) => {
      if (d.timeFrom && d.timeTo) return d.timeFrom < d.timeTo;
      return true;
    },
    {
      message: "El horario de inicio debe ser anterior al de fin",
      path: ["timeTo"],
    },
  );

export type CreateBlockInput = z.infer<typeof createBlockSchema>;

/** Esquema para eliminar un bloqueo. */
export const deleteBlockSchema = z.object({
  blockId: z.string().uuid(),
});
