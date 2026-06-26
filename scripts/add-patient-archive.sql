-- ============================================================================
-- Baja lógica (archivado) + auditoría mínima de edición para pacientes.
-- ----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor de Supabase. Idempotente (IF NOT EXISTS).
--   archived_at / archived_by : baja lógica (quién archivó y cuándo).
--   updated_by                : quién editó por última vez (auditoría).
-- ============================================================================

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by text,
  ADD COLUMN IF NOT EXISTS updated_by  text;

CREATE INDEX IF NOT EXISTS idx_user_archived_at ON "User"(archived_at);
