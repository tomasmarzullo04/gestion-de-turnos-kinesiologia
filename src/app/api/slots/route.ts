import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { slotService } from "@/server/services/slot.service";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  service: z.string().uuid().optional(),
});

/**
 * GET /api/slots?date=YYYY-MM-DD&service=UUID
 * Franjas de un día con cupos restantes y estado. Requiere sesión.
 * Si se pasa `service`, filtra solo las franjas de ese servicio.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    date: request.nextUrl.searchParams.get("date"),
    service: request.nextUrl.searchParams.get("service") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  try {
    const slots = await slotService.getSlotsForDate(
      parsed.data.date,
      parsed.data.service ?? null,
    );
    return NextResponse.json({ slots });
  } catch (error) {
    logger.error("Error al listar franjas", { error: String(error) });
    return NextResponse.json(
      { error: "No se pudieron cargar las franjas" },
      { status: 500 },
    );
  }
}
