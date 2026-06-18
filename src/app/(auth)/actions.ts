"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";

import { signIn, signOut } from "@/lib/auth/auth";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validations/auth";
import {
  authService,
  EmailAlreadyInUseError,
} from "@/server/services/auth.service";
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
