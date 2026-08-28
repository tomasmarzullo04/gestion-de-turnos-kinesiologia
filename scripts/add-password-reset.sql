-- ============================================================================
-- Restablecer contraseña ("olvidé mi contraseña"): tokens de un solo uso.
-- ----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
--   token_hash : SHA-256 del token crudo (el token NUNCA se guarda en claro).
--   expires_at : vencimiento (la app usa 1h).
--   used_at    : marca de uso → un solo uso.
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text        NOT NULL,
  token_hash  text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_user       ON password_reset_tokens(user_id);
