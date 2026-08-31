-- ─────────────────────────────────────────────────────────────────────────────
-- Franja HORARIA de primer turno (14–16, lun/mié/vie): máx 1 primerizo por
-- horario, sobre el cupo NORMAL de la plantilla. Idempotente.
--
-- Garantía de "máx 1 primerizo por slot":
--   - bookings.is_first_time marca la reserva como PRIMER turno (solo el camino
--     capado la pone en true).
--   - Índice único parcial: a lo sumo UNA reserva is_first_time CONFIRMED por
--     slot. Dos primerizos simultáneos sobre el mismo 14:00 → uno inserta, el
--     otro choca el índice → solo uno entra (además del lock FOR UPDATE).
--   - Al cancelar (status→CANCELLED) el asiento se libera (el índice filtra por
--     CONFIRMED).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Flag de primer turno en la reserva (default false; no toca reservas viejas).
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_first_time boolean NOT NULL DEFAULT false;

-- 2) Máx 1 primer turno CONFIRMED por slot (garantía atómica a nivel base).
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_one_first_time_per_slot
  ON bookings (slot_id)
  WHERE is_first_time AND status = 'CONFIRMED';

-- 3) Reserva de primer turno HORARIO sobre slot normal, con candado atómico.
--    Igual que book_slot (lock FOR UPDATE + cupo + duplicado) y ADEMÁS:
--      - rechaza si ya hay un primerizo en el slot (FIRST_TIME_TAKEN),
--      - inserta la reserva marcada is_first_time = true (toma 1 cupo normal).
CREATE OR REPLACE FUNCTION book_slot_first_time(
  p_slot_id UUID,
  p_user_id TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS bookings AS $$
DECLARE
  v_booking bookings;
  v_slot slots;
BEGIN
  SELECT * INTO v_slot FROM slots WHERE id = p_slot_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_NOT_FOUND';
  END IF;

  IF v_slot.is_blocked THEN
    RAISE EXCEPTION 'SLOT_BLOCKED';
  END IF;

  IF v_slot.booked_count >= v_slot.capacity THEN
    RAISE EXCEPTION 'SLOT_FULL';
  END IF;

  -- Ya tiene una reserva activa en la misma franja.
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE slot_id = p_slot_id AND user_id = p_user_id AND status = 'CONFIRMED'
  ) THEN
    RAISE EXCEPTION 'ALREADY_BOOKED';
  END IF;

  -- Máx 1 primerizo por horario (defensa en profundidad bajo el lock; el índice
  -- único parcial es la garantía dura).
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE slot_id = p_slot_id AND status = 'CONFIRMED' AND is_first_time = true
  ) THEN
    RAISE EXCEPTION 'FIRST_TIME_TAKEN';
  END IF;

  INSERT INTO bookings (slot_id, user_id, notes, service_id, status, is_first_time)
  VALUES (p_slot_id, p_user_id, p_notes, v_slot.service_id, 'CONFIRMED', true)
  RETURNING * INTO v_booking;

  UPDATE slots SET booked_count = booked_count + 1 WHERE id = p_slot_id;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql;
