-- ============================================================================
-- Carga de turnos por el profesional (sobrecupo) + alta/onboarding de pacientes.
-- ----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor de Supabase. Idempotente (IF NOT EXISTS).
--   User.must_change_password : fuerza onboarding (cambio de clave) al ingresar.
--   User.created_by           : auditoría — qué profesional creó la cuenta.
--   bookings.is_override      : la reserva es un sobrecupo (excepción manual).
--   bookings.override_by      : qué profesional autorizó el sobrecupo.
-- ============================================================================

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by           text;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_by text;
