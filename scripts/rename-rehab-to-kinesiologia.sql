-- ============================================================================
-- Renombrar el servicio visible "REHAB/Rehabilitación" → "Kinesiología".
-- ----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor de Supabase.
-- SOLO cambia el nombre VISIBLE. NO toca el id ni el slug ('rehab'), de los que
-- dependen la regla de primer turno, copagos, plantillas y reservas.
-- ============================================================================

UPDATE services
SET name = 'Kinesiología'
WHERE slug = 'rehab';
