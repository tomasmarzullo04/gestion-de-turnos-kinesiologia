import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { generationService } from "@/server/services/generation.service";

/**
 * Mantiene la ventana de franjas siempre llena hacia adelante. Pensado para un
 * schedule diario (pg_cron de Supabase, Vercel Cron o n8n Schedule).
 *
 * Auth: header `Authorization: Bearer <CRON_SECRET>`.
 * Soporta GET (Vercel Cron) y POST (n8n / manual).
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await generationService.syncFutureSlots();
    return NextResponse.json({
      ok: true,
      created: result.created,
      updated: result.updated,
      removed: result.removed,
      conflicts: result.conflicts.length,
    });
  } catch (error) {
    logger.error("Cron materialize falló", { error: String(error) });
    return NextResponse.json(
      { error: "No se pudo materializar la agenda" },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
