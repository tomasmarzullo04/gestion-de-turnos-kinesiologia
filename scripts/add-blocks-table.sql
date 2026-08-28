-- Migración: tabla de bloqueos de agenda
-- Ejecutar con las credenciales de producción antes del deploy.

CREATE TABLE IF NOT EXISTS blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID REFERENCES services(id) ON DELETE CASCADE,
  block_type  TEXT NOT NULL CHECK (block_type IN ('TOTAL', 'FIRST_TIME')),
  date_from   DATE NOT NULL,
  date_to     DATE NOT NULL,
  time_from   TIME,
  time_to     TIME,
  reason      TEXT,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  deleted_by  TEXT,
  CHECK (date_from <= date_to),
  CHECK ((time_from IS NULL) = (time_to IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_blocks_dates ON blocks (date_from, date_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blocks_service ON blocks (service_id) WHERE deleted_at IS NULL;
