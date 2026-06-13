import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { slotsQuerySchema } from "@/lib/validations/appointment";
import { appointmentService } from "@/server/services/appointment.service";
import { logger } from "@/lib/logger";

/**
 * GET /api/slots?professionalId=&serviceId=&date=YYYY-MM-DD
 * Devuelve los horarios disponibles para reservar. Requiere sesión.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const parsed = slotsQuerySchema.safeParse({
    professionalId: searchParams.get("professionalId"),
    serviceId: searchParams.get("serviceId"),
    date: searchParams.get("date"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos" },
      { status: 400 },
    );
  }

  try {
    const slots = await appointmentService.getAvailableSlots(
      parsed.data.professionalId,
      parsed.data.serviceId,
      parsed.data.date,
    );
    return NextResponse.json({ slots });
  } catch (error) {
    logger.error("Error al calcular slots", { error: String(error) });
    return NextResponse.json(
      { error: "No se pudieron calcular los horarios" },
      { status: 500 },
    );
  }
}
