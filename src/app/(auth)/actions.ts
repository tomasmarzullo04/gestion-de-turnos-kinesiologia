"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { after } from "next/server";

import { signIn, signOut } from "@/lib/auth/auth";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validations/auth";
import {
  authService,
  EmailAlreadyInUseError,
} from "@/server/services/auth.service";
import { passwordResetService } from "@/server/services/password-reset.service";
import { sendResetEmail } from "@/server/email/send-reset-email";
import { type ActionResult } from "@/types";

/**
 * Detecta el "error" que Next.js lanza al redirigir (signIn con redirectTo).
 * Hay que relanzarlo para que la navegación ocurra.
 */
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/** Obtiene una IP aproximada del cliente para el rate limiting. */
async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

const PATIENT_HOME = "/portal";

export async function loginAction(
  input: LoginInput,
  callbackUrl?: string,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const ip = await getClientIp();
  // Máximo 5 intentos por minuto por IP+email.
  const limit = rateLimit(
    `login:${ip}:${parsed.data.email}`,
    5,
    60 * 1000,
  );
  if (!limit.success) {
    return {
      success: false,
      error: `Demasiados intentos. Probá de nuevo en ${limit.retryAfter}s.`,
    };
  }

  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : PATIENT_HOME;

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    // El redirect exitoso se propaga como error especial: hay que relanzarlo.
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { success: false, error: "Email o contraseña incorrectos" };
    }
    logger.error("Error inesperado en login", { error: String(error) });
    return { success: false, error: "Ocurrió un error. Intentá nuevamente." };
  }

  return { success: true, data: undefined };
}

export async function registerAction(
  input: RegisterInput,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const ip = await getClientIp();
  // Máximo 5 registros por hora por IP.
  const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.success) {
    return {
      success: false,
      error: `Demasiados registros desde esta red. Reintentá en ${limit.retryAfter}s.`,
    };
  }

  try {
    await authService.registerPatient(parsed.data);
  } catch (error) {
    if (error instanceof EmailAlreadyInUseError) {
      return {
        success: false,
        error: error.message,
        fieldErrors: { email: [error.message] },
      };
    }
    logger.error("Error en registro", { error: String(error) });
    return { success: false, error: "No se pudo crear la cuenta. Intentá nuevamente." };
  }

  // Auto-login tras registro exitoso (los pacientes van a su portal).
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: PATIENT_HOME,
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    // Si el auto-login falla, la cuenta existe igual: mandamos a login.
    return { success: true, data: undefined };
  }

  return { success: true, data: undefined };
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

/** Base URL absoluta para armar el enlace del email (env o host del request). */
async function getBaseUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/+$/, "");
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Solicitud de restablecimiento. SIEMPRE responde igual (no revela si el email
 * existe). Rate-limited por IP+email. El envío del correo lo hace la Edge
 * Function de Supabase; nunca se loguea el token ni la URL.
 */
export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Email inválido",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const ip = await getClientIp();
  // Máximo 3 solicitudes cada 15 minutos por IP+email → frena spam de correos.
  const limit = rateLimit(`reset-req:${ip}:${parsed.data.email}`, 3, 15 * 60 * 1000);
  if (!limit.success) {
    return {
      success: false,
      error: `Demasiadas solicitudes. Probá de nuevo en ${limit.retryAfter}s.`,
    };
  }

  try {
    const token = await passwordResetService.createTokenForEmail(parsed.data.email);
    if (token) {
      const base = await getBaseUrl();
      const resetUrl = `${base}/reset-password?token=${token.rawToken}`;
      const email = parsed.data.email;
      const name = token.name;
      // Envío en segundo plano (after): no bloquea la respuesta ni la altera.
      after(async () => {
        try {
          await sendResetEmail({ email, name, resetUrl, expiresInMinutes: 60 });
        } catch (error) {
          logger.warn("Fallo al enviar el email de restablecimiento", {
            error: String(error),
          });
        }
      });
    }
  } catch (error) {
    logger.error("Error en forgotPassword", { error: String(error) });
    // Igual respondemos genérico.
  }

  // Respuesta genérica siempre (exista o no la cuenta).
  return { success: true, data: undefined };
}

/**
 * Define la nueva contraseña con el token del enlace. Valida token (existe, no
 * usado, no vencido), hashea con bcrypt y marca el token como usado.
 */
export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const ip = await getClientIp();
  const limit = rateLimit(`reset-confirm:${ip}`, 10, 60 * 1000);
  if (!limit.success) {
    return {
      success: false,
      error: `Demasiados intentos. Probá de nuevo en ${limit.retryAfter}s.`,
    };
  }

  try {
    const ok = await passwordResetService.resetPassword(
      parsed.data.token,
      parsed.data.password,
    );
    if (!ok) {
      return {
        success: false,
        error: "El enlace es inválido o venció. Pedí uno nuevo.",
      };
    }
    return { success: true, data: undefined };
  } catch (error) {
    logger.error("Error en resetPassword", { error: String(error) });
    return { success: false, error: "No se pudo restablecer. Intentá nuevamente." };
  }
}
