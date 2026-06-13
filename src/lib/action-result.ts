import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { BusinessError } from "@/server/errors";
import { type ActionResult } from "@/types";

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { success: false, error, fieldErrors };
}

/**
 * Convierte una excepción en un ActionResult de error. Los errores de negocio,
 * autorización y validación exponen su mensaje; el resto se registra y se
 * devuelve un mensaje genérico (no se filtran detalles internos).
 */
export function fromError(error: unknown): ActionResult<never> {
  if (error instanceof ZodError) {
    return fail("Datos inválidos", error.flatten().fieldErrors as Record<string, string[]>);
  }
  if (error instanceof BusinessError) {
    return fail(error.message);
  }
  if (error instanceof AuthorizationError) {
    return fail(error.message);
  }
  logger.error("Error no controlado en acción", { error: String(error) });
  return fail("Ocurrió un error inesperado. Intentá nuevamente.");
}
