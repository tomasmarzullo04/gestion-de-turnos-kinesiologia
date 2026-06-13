import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const availabilitySchema = z
  .object({
    professionalId: z.string().min(1, "Seleccioná un profesional"),
    dayOfWeek: z
      .number({ invalid_type_error: "Seleccioná un día" })
      .int()
      .min(0, "Día inválido")
      .max(6, "Día inválido"),
    startTime: z.string().regex(timeRegex, "Hora inválida (HH:mm)"),
    endTime: z.string().regex(timeRegex, "Hora inválida (HH:mm)"),
  })
  .refine(
    (data) => {
      const [sh, sm] = data.startTime.split(":").map(Number);
      const [eh, em] = data.endTime.split(":").map(Number);
      return sh * 60 + sm < eh * 60 + em;
    },
    {
      message: "La hora de fin debe ser posterior a la de inicio",
      path: ["endTime"],
    },
  );

export type AvailabilityInput = z.infer<typeof availabilitySchema>;
