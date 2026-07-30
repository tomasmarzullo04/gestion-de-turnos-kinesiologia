-- ============================================================================
-- Primer turno de Kinesiología en turnos individuales de 40 min (capacidad 1).
-- ----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
--
-- 100% ADITIVO: no cambia el comportamiento de las franjas por hora.
--  - is_first_time: marca los turnos de 40 min. Todas las franjas normales
--    quedan en `false` (default) → el sistema por hora ni se entera.
--  - Índice único PARCIAL (solo WHERE is_first_time): garantiza 1 solo turno de
--    40 min por (servicio, fecha, hora). NO toca el UNIQUE existente
--    (professional_id, date, start_time), que sigue igual para las franjas por
--    hora. Como los slots de kinesio tienen professional_id NULL (distinct en
--    SQL), un turno de 40 min a las 08:00 convive con la franja horaria de 08:00
--    sin colisión.
-- ============================================================================

ALTER TABLE slots
  ADD COLUMN IF NOT EXISTS is_first_time boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_slots_first_time
  ON slots (service_id, date, start_time)
  WHERE is_first_time;
