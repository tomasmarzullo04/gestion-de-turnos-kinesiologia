import { z } from "zod";

import { ATTENDANCE_STATUS_VALUES } from "@/lib/booking-config";

export const markAttendanceSchema = z.object({
  bookingId: z.string().uuid("Reserva inválida"),
  status: z.enum(ATTENDANCE_STATUS_VALUES),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
