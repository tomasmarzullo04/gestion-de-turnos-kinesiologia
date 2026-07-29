import { createHash, randomBytes } from "node:crypto";

import { hash } from "bcryptjs";

import { prisma } from "@/lib/db";

const SALT_ROUNDS = 12;
const TTL_MINUTES = 60;

/** SHA-256 en hex. El token es aleatorio de 256 bits → hash rápido e indexable. */
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const passwordResetService = {
  /**
   * Genera un token de restablecimiento para el email dado, SI existe la cuenta.
   * Guarda solo el hash (nunca el token en claro), con expiración de 1h, e
   * invalida cualquier token previo sin usar del mismo usuario.
   *
   * @returns el token CRUDO + nombre del usuario, o `null` si el email no existe
   *          (el llamador debe responder igual en ambos casos: no revelar).
   */
  async createTokenForEmail(
    email: string,
  ): Promise<{ userId: string; name: string | null; rawToken: string } | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });
    if (!user) return null;

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

    // Invalida tokens previos no usados (solo el último enlace vale).
    await prisma.$executeRaw`
      UPDATE password_reset_tokens SET used_at = now()
      WHERE user_id = ${user.id} AND used_at IS NULL
    `;
    await prisma.$executeRaw`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, ${expiresAt})
    `;

    return { userId: user.id, name: user.name, rawToken };
  },

  /**
   * Consume un token y define la nueva contraseña. Válido solo si el token
   * existe, no fue usado y no venció. Hashea con bcrypt, marca el token usado e
   * invalida el resto de tokens del usuario (todo atómico).
   *
   * @returns `true` si se restableció; `false` si el token es inválido/vencido.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<boolean> {
    const tokenHash = sha256(rawToken);
    const rows = await prisma.$queryRaw<{ user_id: string }[]>`
      SELECT user_id FROM password_reset_tokens
      WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
      LIMIT 1
    `;
    const userId = rows[0]?.user_id;
    if (!userId) return false;

    const passwordHash = await hash(newPassword, SALT_ROUNDS);
    await prisma.$transaction([
      prisma.$executeRaw`UPDATE "User" SET "passwordHash" = ${passwordHash} WHERE id = ${userId}`,
      prisma.$executeRaw`
        UPDATE password_reset_tokens SET used_at = now()
        WHERE user_id = ${userId} AND used_at IS NULL
      `,
    ]);
    return true;
  },
};
