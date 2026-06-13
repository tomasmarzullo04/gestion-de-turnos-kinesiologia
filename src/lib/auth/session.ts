import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { ROLES, type Role } from "@/lib/constants";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Devuelve el usuario actual o `null` si no hay sesión. No redirige. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
  };
}

/** Garantiza que haya sesión; si no, redirige a /login. Para uso en páginas. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Garantiza sesión + rol exacto. Redirige a /login si no hay sesión y a la
 * home del rol correcto si el rol no coincide. Para uso en páginas/layouts.
 */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) {
    redirect(user.role === ROLES.ADMIN ? "/admin" : "/portal");
  }
  return user;
}

export const requireAdmin = () => requireRole(ROLES.ADMIN);
export const requirePatient = () => requireRole(ROLES.PATIENT);

/** Error de autorización para usar dentro de Server Actions. */
export class AuthorizationError extends Error {
  constructor(message = "No autorizado") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Versión para Server Actions: lanza `AuthorizationError` en vez de redirigir,
 * de modo que la action pueda devolver un ActionResult de error.
 */
export async function assertRole(role: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Necesitás iniciar sesión");
  if (user.role !== role) throw new AuthorizationError("No tenés permisos para esta acción");
  return user;
}

export async function assertAuthenticated(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Necesitás iniciar sesión");
  return user;
}
