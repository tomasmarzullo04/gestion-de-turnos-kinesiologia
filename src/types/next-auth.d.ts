import type { DefaultSession } from "next-auth";

import type { Role } from "@/lib/constants";

/**
 * Aumentamos los tipos de Auth.js para incluir `id` y `role` en la sesión,
 * el usuario y el token JWT.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
