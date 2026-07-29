import { logger } from "@/lib/logger";

/**
 * Dispara el envío del email de restablecimiento a través de la Edge Function
 * de Supabase (que a su vez manda el correo por Gmail). La app NO manda el mail
 * directo: solo le pasa el enlace ya armado.
 *
 * Seguridad: se autentica con un secreto compartido (`RESET_FN_SECRET`) para que
 * nadie más pueda invocar la Function. NUNCA se loguea la `resetUrl` (contiene
 * el token).
 */
export async function sendResetEmail(input: {
  email: string;
  name: string | null;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<void> {
  const url = process.env.SUPABASE_RESET_FN_URL;
  const secret = process.env.RESET_FN_SECRET ?? "";
  if (!url) {
    logger.warn("SUPABASE_RESET_FN_URL no configurado; no se envía el email de reset");
    return;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Reset-Secret": secret,
    },
    body: JSON.stringify({
      email: input.email,
      name: input.name,
      resetUrl: input.resetUrl,
      expiresInMinutes: input.expiresInMinutes,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    // No exponemos detalle al usuario; solo dejamos rastro server-side (sin token).
    logger.warn("La Edge Function de reset respondió con error", {
      status: res.status,
      email: input.email,
    });
  }
}
