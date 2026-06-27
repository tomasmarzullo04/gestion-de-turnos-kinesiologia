import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { slotService } from "@/server/services/slot.service";

const querySchema = z.object({
  service: z.string().uuid("Servicio inválido"),
});

/**
 * GET /api/slots/availability?service=UUID
 * Disponibilidad próxima del servicio (días → franjas con cupos). Requiere sesión.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    service: request.nextUrl.searchParams.get("service") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  try {
    const days = await slotService.getServiceAvailability(parsed.data.service);
    return NextResponse.json({ days });
  } catch (error) {
    logger.error("Error al cargar disponibilidad del servicio", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "No se pudo cargar la disponibilidad" },
      { status: 500 },
    );
  }
}
