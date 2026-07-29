-- ============================================================================
-- Orden de pacientes por apellido: campo `apellido` editable.
-- ----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- Se hace backfill derivando la ÚLTIMA palabra del nombre como punto de partida;
-- el profesional puede corregir los apellidos compuestos desde la ficha.
-- ============================================================================

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS apellido text;

-- Backfill: solo pacientes que aún no tienen apellido cargado.
UPDATE "User"
SET apellido = substring(btrim(name) FROM '(\S+)$')
WHERE role = 'PATIENT'
  AND (apellido IS NULL OR btrim(apellido) = '');

CREATE INDEX IF NOT EXISTS idx_user_apellido ON "User"(apellido);
