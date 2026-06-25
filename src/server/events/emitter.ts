import { createHmac } from "node:crypto";

import { logger } from "@/lib/logger";

/**
 * Emisor de eventos hacia n8n (u otro consumidor) vía webhook firmado.
 *
 * Diseño:
 *  - FIRE-AND-FORGET: nunca lanza. Si el webhook falla, se loguea y se ignora;
 *    jamás debe afectar la operación que lo originó (p. ej. una reserva).
 *  - Firma HMAC-SHA256 del body con WEBHOOK_SECRET en el header `X-Signature`.
 *  - `X-Idempotency-Key` único por evento para que n8n deduplique reintentos.
 *
 * Conviene invocarlo con `after()` (next/server) para que corra DESPUÉS de
 * responderle al usuario, sin bloquear su respuesta.
 */
export async function emitEvent(
  event: string,
  data: unknown,
  idempotencyKey: string,
): Promise<void> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    logger.warn("N8N_WEBHOOK_URL no configurado; se omite el evento", { event });
    return;
  }

  const secret = process.env.WEBHOOK_SECRET ?? "";
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data,
  });
  if (!secret) {
    // Sin secreto el header X-Signature va vacío y n8n no puede verificar nada.
    // Avisamos en vez de fallar en silencio: el evento igual se emite.
    logger.warn(
      "WEBHOOK_SECRET no configurado; el evento se envía SIN firmar (X-Signature vacío)",
      { event },
    );
  }
  const signature = secret
    ? createHmac("sha256", secret).update(body).digest("hex")
    : "";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signature,
        "X-Idempotency-Key": idempotencyKey,
      },
      body,
      // Evita que una respuesta colgada deje el handler esperando indefinidamente.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      logger.warn("Webhook respondió con error", {
        event,
        status: res.status,
      });
    } else {
      logger.info("Evento emitido", { event, idempotencyKey });
    }
  } catch (error) {
    // Nunca propagamos: el fallo del webhook no debe romper nada.
    logger.error("Fallo al emitir evento (ignorado)", {
      event,
      error: String(error),
    });
  }
}
