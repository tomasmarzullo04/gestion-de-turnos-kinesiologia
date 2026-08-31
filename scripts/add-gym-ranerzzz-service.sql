-- ─────────────────────────────────────────────────────────────────────────────
-- Alta del servicio "GYM RANERZZZ" (servicio NORMAL por cupo, sin regla de
-- primer turno). Idempotente: se puede correr varias veces sin duplicar.
--
-- El servicio nace SIN configuración de cupos/horarios: los define el
-- profesional desde Plantillas. Por eso:
--   - schedule = '[]' (vacío): sin plantilla, el paciente no ve horarios.
--   - capacity = 1: valor NEUTRO por el NOT NULL/DEFAULT de la tabla; NO es
--     fuente de verdad. La capacidad real de cada franja sale de la plantilla
--     (slot_templates). El selector del paciente muestra "Según disponibilidad"
--     hasta que haya plantilla, y luego los cupos reales de la plantilla.
--
-- El identificador interno (slug) es estable y NO debe cambiar nunca.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO services (name, slug, color, capacity, schedule, active) VALUES
  (
    'GYM RANERZZZ',   -- nombre visible (exacto, con las tres Z)
    'gym-ranerzzz',   -- slug interno estable (único; no colisiona)
    '#3b82f6',        -- azul (distinto de los servicios existentes)
    1,                -- capacity neutro (la plantilla manda; ver nota arriba)
    '[]'::jsonb,      -- sin horarios propios: los define la plantilla
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  -- Solo re-alinea lo cosmético (nombre/color); NO toca capacity/schedule/active
  -- para no pisar lo que el profesional haya configurado luego.
  name  = EXCLUDED.name,
  color = EXCLUDED.color;
