import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/auth.config";
import { ROLES } from "@/lib/constants";

// Instancia edge-safe (sin Credentials/Prisma): solo decodifica el JWT.
const { auth } = NextAuth(authConfig);

const ADMIN_PREFIX = "/admin";
const PATIENT_PREFIX = "/portal";
const AUTH_ROUTES = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const role = session?.user?.role;
  const isLoggedIn = Boolean(session?.user);

  const { pathname } = nextUrl;

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isPatientRoute = pathname.startsWith(PATIENT_PREFIX);

  // Usuario logueado intentando ir a login/registro → a su home.
  if (isAuthRoute && isLoggedIn) {
    const home = role === ROLES.ADMIN ? ADMIN_PREFIX : PATIENT_PREFIX;
    return NextResponse.redirect(new URL(home, nextUrl));
  }

  // Rutas protegidas sin sesión → login (preservando destino).
  if ((isAdminRoute || isPatientRoute) && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Control de rol cruzado.
  if (isAdminRoute && role !== ROLES.ADMIN) {
    return NextResponse.redirect(new URL(PATIENT_PREFIX, nextUrl));
  }
  if (isPatientRoute && role !== ROLES.PATIENT) {
    return NextResponse.redirect(new URL(ADMIN_PREFIX, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Ejecutar en todo excepto assets estáticos y la API de auth.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
