import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Restaurando tabla attendances...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS attendances (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      status text NOT NULL,
      marked_by text NOT NULL,
      marked_at timestamptz DEFAULT now(),
      UNIQUE(booking_id)
    );
  `);
  
  console.log("Restaurando funciones de PostgreSQL...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION book_slot(p_slot_id uuid, p_user_id text, p_notes text)
    RETURNS bookings AS $$
    DECLARE
      v_slot slots%ROWTYPE;
      v_booking bookings;
    BEGIN
      -- Bloquear la fila del slot para concurrencia
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
      
      IF EXISTS (SELECT 1 FROM bookings WHERE slot_id = p_slot_id AND user_id = p_user_id AND status = 'CONFIRMED') THEN
        RAISE EXCEPTION 'ALREADY_BOOKED';
      END IF;
      
      -- Insertar la reserva
      INSERT INTO bookings (slot_id, user_id, notes, status, created_at)
      VALUES (p_slot_id, p_user_id, p_notes, 'CONFIRMED', now())
      RETURNING * INTO v_booking;
      
      -- Actualizar contador
      UPDATE slots SET booked_count = booked_count + 1 WHERE id = p_slot_id;
      
      RETURN v_booking;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id uuid, p_user_id text)
    RETURNS void AS $$
    DECLARE
      v_booking bookings%ROWTYPE;
    BEGIN
      SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
      
      IF NOT FOUND OR v_booking.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'BOOKING_NOT_FOUND';
      END IF;
      
      IF v_booking.user_id <> p_user_id THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      
      UPDATE bookings SET status = 'CANCELLED' WHERE id = p_booking_id;
      
      -- Decrementar contador
      UPDATE slots SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = v_booking.slot_id;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  console.log("Restauración completa.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
