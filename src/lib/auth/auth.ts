import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { authConfig } from "@/lib/auth/auth.config";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { type Role } from "@/lib/constants";
import { logger } from "@/lib/logger";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          // Comparación dummy para mitigar enumeración por tiempos.
          await compare(password, "$2a$12$invalidinvalidinvalidinvalidinvaliduO");
          return null;
        }

        const passwordMatches = await compare(password, user.passwordHash);
        if (!passwordMatches) {
          logger.warn("Intento de login fallido", { userId: user.id });
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as Role,
        };
      },
    }),
  ],
});
