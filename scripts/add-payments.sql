-- ============================================================================
-- Pagos (copagos + cobros extra) y configuración de monto de copago.
-- ----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor de Supabase. Idempotente (IF NOT EXISTS).
-- ============================================================================

-- Monto vigente del copago (editable desde el panel). Una sola fila (id = 1).
CREATE TABLE IF NOT EXISTS billing_settings (
  id            int         PRIMARY KEY DEFAULT 1,
  copago_amount int         NOT NULL DEFAULT 4000 CHECK (copago_amount >= 0),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_settings_single_row CHECK (id = 1)
);

INSERT INTO billing_settings (id, copago_amount)
VALUES (1, 4000)
ON CONFLICT (id) DO NOTHING;

-- Pagos. Cada fila es un movimiento económico:
--   - COPAGO: quantity = cuántos copagos del período cubre (amount = total).
--   - EXTRA : cobro puntual (quantity = 1, concept = concepto/nota).
-- Auditoría: recorded_by_id / recorded_at. Anulación con registro (voided_*),
-- nunca se borra una fila para no perder el rastro.
CREATE TABLE IF NOT EXISTS payments (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        text        NOT NULL,                          -- paciente (User.id)
  type           text        NOT NULL CHECK (type IN ('COPAGO', 'EXTRA')),
  amount         int         NOT NULL CHECK (amount >= 0),      -- total en $ (pesos)
  quantity       int         NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  period_month   int         NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year    int         NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  concept        text,
  paid_at        timestamptz NOT NULL DEFAULT now(),
  recorded_by_id text        NOT NULL,                          -- profesional (User.id)
  recorded_at    timestamptz NOT NULL DEFAULT now(),
  voided_at      timestamptz,
  voided_by_id   text,
  void_reason    text
);

CREATE INDEX IF NOT EXISTS idx_payments_user   ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_period ON payments(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payments_type   ON payments(type);
