import type { NextAuthConfig } from "next-auth";

import { ROLES, type Role } from "@/lib/constants";

/**
 * Configuración de Auth.js compartida entre el middleware (edge runtime) y la
 * instancia completa del servidor. NO debe importar Prisma ni bcrypt (no son
 * compatibles con el edge runtime). Los providers se agregan en `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  },
  trustHost: true,
  callbacks: {
    // Persistimos id y rol en el token al iniciar sesión.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: Role }).role ?? ROLES.PATIENT;
      }
      return token;
    },
    // Exponemos id y rol en la sesión del cliente.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  providers: [], // Se completan en auth.ts (Credentials).
} satisfies NextAuthConfig;
