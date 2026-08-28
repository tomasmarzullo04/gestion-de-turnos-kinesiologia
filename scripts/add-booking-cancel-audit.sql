-- ============================================================================
-- Auditoría de cancelación de turnos por el profesional.
-- ----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor de Supabase. Idempotente (IF NOT EXISTS).
--   cancelled_by : id del profesional que canceló el turno.
--   cancelled_at : cuándo se canceló.
-- La cancelación en sí (soft: status CANCELLED + booked_count-1) la sigue
-- haciendo cancel_booking; esto solo agrega el rastro de auditoría.
-- ============================================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_by text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
