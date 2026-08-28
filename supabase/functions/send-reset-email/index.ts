// Supabase Edge Function: send-reset-email
// ---------------------------------------------------------------------------
// Recibe { email, name, resetUrl, expiresInMinutes } desde la app (autenticado
// con el header X-Reset-Secret) y envía el correo de restablecimiento por Gmail
// SMTP. La app arma el token/enlace; esta función SOLO manda el mail.
//
// Deploy:
//   supabase functions deploy send-reset-email --no-verify-jwt
// Secrets (Supabase → Edge Functions → Secrets, o `supabase secrets set`):
//   RESET_FN_SECRET      = <mismo valor que en la app>
//   GMAIL_USER           = centroapexmdp@gmail.com
//   GMAIL_APP_PASSWORD   = <app password de Gmail (16 chars, sin espacios)>
// ---------------------------------------------------------------------------

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const NAVY = "#1b3a5b";
const CELESTE = "#5b9bd5";
const LOGO =
  "https://res.cloudinary.com/dnfqkzxbp/image/upload/v1782304705/WhatsApp_Image_2026-06-24_at_09.13.03_n59urr.jpg";

function buildHtml(name: string | null, resetUrl: string, minutes: number): string {
  const hi = name ? `Hola ${name},` : "Hola,";
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#eef2f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f6;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08);">
        <tr><td style="background-color:${NAVY};padding:24px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;padding-right:12px;"><img src="${LOGO}" width="44" height="44" alt="Apex" style="display:block;border:0;border-radius:8px;background:#fff;"></td>
            <td style="vertical-align:middle;"><span style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#fff;letter-spacing:.5px;">Apex</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:${CELESTE};height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:36px 32px 8px 32px;">
          <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${CELESTE};">Restablecer contraseña</p>
          <h1 style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:22px;line-height:1.3;font-weight:700;color:${NAVY};">${hi}</h1>
          <p style="margin:0 0 24px 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#475467;">
            Recibimos una solicitud para restablecer tu contraseña. Tocá el botón para elegir una nueva. El enlace vence en ${minutes} minutos.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 8px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
            <td align="center" style="background-color:${NAVY};border-radius:8px;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#fff;text-decoration:none;border-radius:8px;">Restablecer contraseña</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:20px 32px 36px 32px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#667085;">Si el botón no funciona, copiá y pegá este enlace:</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:${CELESTE};word-break:break-all;">${resetUrl}</p>
          <p style="margin:16px 0 0 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#98a2b3;">Si no pediste esto, ignorá este correo: tu contraseña no cambia.</p>
        </td></tr>
        <tr><td style="background-color:#f5f8fb;border-top:1px solid #dce6f0;padding:20px 32px;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#98a2b3;text-align:center;">Apex · Entrenamiento, kinesiología y recovery</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  const secret = Deno.env.get("RESET_FN_SECRET") ?? "";
  if (!secret || req.headers.get("x-reset-secret") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  let body: { email?: string; name?: string | null; resetUrl?: string; expiresInMinutes?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 });
  }

  const { email, name = null, resetUrl, expiresInMinutes = 60 } = body;
  if (!email || !resetUrl) {
    return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400 });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!gmailUser || !gmailPass) {
    return new Response(JSON.stringify({ error: "smtp_not_configured" }), { status: 500 });
  }

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: gmailUser, password: gmailPass },
    },
  });

  try {
    await client.send({
      from: `Apex <${gmailUser}>`,
      to: email,
      subject: "Restablecer tu contraseña · Apex",
      html: buildHtml(name, resetUrl, expiresInMinutes),
    });
    await client.close();
  } catch (err) {
    console.error("SMTP send failed:", String(err));
    return new Response(JSON.stringify({ error: "send_failed" }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
