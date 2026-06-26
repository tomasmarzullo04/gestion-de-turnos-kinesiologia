-- ============================================================================
-- Turnos fijos (reservas recurrentes): agrupar las reservas de una serie.
-- ----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor de Supabase. Idempotente (IF NOT EXISTS).
-- `recurrence_id` es común a todas las reservas generadas por una misma serie;
-- NULL en las reservas sueltas. No hay cambios en book_slot/cancel_booking.
-- ============================================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS recurrence_id uuid;

CREATE INDEX IF NOT EXISTS idx_bookings_recurrence ON bookings(recurrence_id);
