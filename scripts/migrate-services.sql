-- ============================================================================
-- MIGRACIÓN: Sistema de Servicios, Cobertura y Tratamientos
-- ============================================================================
-- Ejecutar en Supabase SQL Editor (o psql) en este orden.
-- Todos los cambios son aditivos (no destructivos). Safe para producción.
--
-- Resumen:
--   1. Tabla `services` (catálogo de servicios con reglas en JSONB)
--   2. Campos de cobertura/tratamiento en `User`
--   3. Tabla `professional_services` (relación N:M)
--   4. `service_id` en slot_templates, slots y bookings
--   5. Actualización de la función atómica `book_slot`
--   6. Seed de los 5 servicios iniciales
-- ============================================================================

BEGIN;

-- ─── 1. TABLA SERVICES ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  capacity    INT NOT NULL DEFAULT 1,
  schedule    JSONB NOT NULL DEFAULT '[]'::jsonb,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE services IS 'Catálogo de servicios del estudio (RPG, GYM, etc.)';
COMMENT ON COLUMN services.schedule IS 'Array JSON de reglas: [{days:[1,2,3], start:"08:00", end:"20:00"}]';
COMMENT ON COLUMN services.capacity IS 'Capacidad por hora por defecto para este servicio';
COMMENT ON COLUMN services.color IS 'Color hex para badges y UI';

-- ─── 2. CAMPOS DE COBERTURA Y TRATAMIENTO EN USER ──────────────────────────

-- Utilizamos VARCHAR(50) en lugar de ENUM para evitar desajustes con Prisma (String? @db.VarChar)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS tipo_cobertura     VARCHAR(50) DEFAULT 'PARTICULAR',
  ADD COLUMN IF NOT EXISTS obra_social_nombre TEXT,
  ADD COLUMN IF NOT EXISTS requiere_copago    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sesiones_totales   INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS numero_sesion_actual INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS es_primera_vez     BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tratamiento_inicio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tratamiento_fin    TIMESTAMPTZ;

COMMENT ON COLUMN "User".tipo_cobertura IS 'OBRA_SOCIAL o PARTICULAR';
COMMENT ON COLUMN "User".obra_social_nombre IS 'Nombre de la obra social (nullable si PARTICULAR)';
COMMENT ON COLUMN "User".requiere_copago IS 'Si el paciente debe pagar copago';
COMMENT ON COLUMN "User".sesiones_totales IS 'Total de sesiones asignadas en el tratamiento actual';
COMMENT ON COLUMN "User".numero_sesion_actual IS 'Número de sesión actual (se autoincrementa con cada reserva)';
COMMENT ON COLUMN "User".es_primera_vez IS 'true si nunca reservó; restringe días/horarios disponibles';
COMMENT ON COLUMN "User".tratamiento_inicio IS 'Fecha de inicio del tratamiento asignado';
COMMENT ON COLUMN "User".tratamiento_fin IS 'Fecha de fin del tratamiento asignado';

-- Los admins existentes no necesitan estos campos; solo aplican a PATIENT.
-- Seteamos es_primera_vez = false para admins existentes.
UPDATE "User" SET es_primera_vez = false WHERE role = 'ADMIN';

-- ─── 3. TABLA PROFESSIONAL_SERVICES ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS professional_services (
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id      UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, service_id)
);

COMMENT ON TABLE professional_services IS 'Relación N:M entre profesionales y servicios habilitados';

-- ─── 4. SERVICE_ID EN SLOT_TEMPLATES, SLOTS Y BOOKINGS ────────────────────

-- slot_templates
ALTER TABLE slot_templates
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_slot_templates_service ON slot_templates(service_id);

-- slots
ALTER TABLE slots
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_slots_service ON slots(service_id);

-- bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id);

-- ─── 5. ACTUALIZAR FUNCIÓN ATÓMICA book_slot ──────────────────────────────
-- Mantiene la misma firma (slot_id, user_id, notes) para no romper el código
-- existente. Ahora copia service_id del slot al booking automáticamente.

CREATE OR REPLACE FUNCTION book_slot(
  p_slot_id UUID,
  p_user_id TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS bookings AS $$
DECLARE
  v_booking bookings;
  v_slot slots;
BEGIN
  -- Lock optimista: bloquea la fila del slot para esta transacción.
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

  -- Verificar que no tenga una reserva activa en la misma franja.
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE slot_id = p_slot_id
      AND user_id = p_user_id
      AND status = 'CONFIRMED'
  ) THEN
    RAISE EXCEPTION 'ALREADY_BOOKED';
  END IF;

  -- Insertar la reserva, copiando service_id del slot.
  INSERT INTO bookings (slot_id, user_id, notes, service_id, status)
  VALUES (p_slot_id, p_user_id, p_notes, v_slot.service_id, 'CONFIRMED')
  RETURNING * INTO v_booking;

  -- Incrementar el contador de cupos ocupados.
  UPDATE slots SET booked_count = booked_count + 1 WHERE id = p_slot_id;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql;

-- ─── 6. SEED DE SERVICIOS INICIALES ───────────────────────────────────────

INSERT INTO services (name, slug, color, capacity, schedule) VALUES
  (
    'RPG',
    'rpg',
    '#8b5cf6',
    1,
    '[{"days":[1,2,3,4,5],"start":"08:00","end":"20:00"}]'::jsonb
  ),
  (
    'RECOVERY',
    'recovery',
    '#06b6d4',
    2,
    '[{"days":[2,4],"start":"08:00","end":"13:00"},{"days":[5],"start":"12:00","end":"16:00"}]'::jsonb
  ),
  (
    'RESPI',
    'respi',
    '#f59e0b',
    4,
    '[{"days":[2,4],"start":"16:00","end":"18:00"}]'::jsonb
  ),
  (
    'GYM',
    'gym',
    '#22c55e',
    6,
    '[{"days":[1,3,5],"start":"08:00","end":"12:00"},{"days":[1,3,5],"start":"16:00","end":"20:00"}]'::jsonb
  ),
  (
    'REHAB',
    'rehab',
    '#ef4444',
    5,
    '[{"days":[1,3,5],"start":"08:00","end":"12:00"},{"days":[1,3,5],"start":"16:00","end":"20:00"}]'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  capacity = EXCLUDED.capacity,
  schedule = EXCLUDED.schedule;

-- ─── 7. HABILITAR REALTIME EN BOOKINGS ────────────────────────────────────
-- (Para notificaciones in-app al admin cuando se crea un turno)
-- Nota: si ya está habilitado en slots, solo hay que agregar bookings.

ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- Policy RLS de lectura para bookings (Realtime necesita poder leer).
-- Si ya existe, el DO block evita el error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Allow read for authenticated'
  ) THEN
    CREATE POLICY "Allow read for authenticated"
      ON bookings FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END$$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN: Ejecutar después de la migración para confirmar que todo OK.
-- ============================================================================
-- SELECT * FROM services ORDER BY name;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'User' AND column_name LIKE '%cobertura%';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'slot_templates' AND column_name = 'service_id';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'slots' AND column_name = 'service_id';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'service_id';
-- SELECT * FROM professional_services LIMIT 1;
