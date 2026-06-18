import type { Role } from "@/lib/constants";

/**
 * Resultado tipado para Server Actions. Permite a la UI distinguir éxito de
 * error sin lanzar excepciones a través del límite cliente/servidor.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export type { Role };
