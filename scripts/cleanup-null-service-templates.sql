-- ============================================================================
-- Limpieza del grupo "Sin servicio" (plantillas y franjas sin service_id)
-- ----------------------------------------------------------------------------
-- Las plantillas sin servicio son residuo del modelo genérico anterior. Este
-- script es SEGURO: primero reporta y solo borra si NO hay reservas CONFIRMED
-- colgando de franjas futuras sin servicio. Si las hay, no toca nada y te avisa
-- para que decidas (reasignar a un servicio o gestionarlas).
--
-- Cómo usarlo: pegalo en el SQL Editor de Supabase y ejecutalo. Mirá primero
-- los dos reportes; el bloque final aplica la baja segura.
-- ============================================================================

-- 1) REPORTE — Plantillas sin servicio (qué se daría de baja).
SELECT st.id,
       st.day_of_week,
       to_char(st.start_time, 'HH24:MI') AS start_time,
       to_char(st.end_time, 'HH24:MI')   AS end_time,
       st.capacity,
       st.active
FROM slot_templates st
WHERE st.service_id IS NULL
ORDER BY st.day_of_week, st.start_time;

-- 2) REPORTE — Reservas CONFIRMED colgando de franjas FUTURAS sin servicio.
--    Si esto devuelve filas, son los CONFLICTOS: no se borrará nada.
SELECT s.date,
       to_char(s.start_time, 'HH24:MI') AS start_time,
       to_char(s.end_time, 'HH24:MI')   AS end_time,
       count(b.id)                       AS reservas_confirmadas
FROM slots s
JOIN bookings b ON b.slot_id = s.id AND b.status = 'CONFIRMED'
WHERE s.service_id IS NULL
  AND s.date >= current_date
GROUP BY s.date, s.start_time, s.end_time
ORDER BY s.date, s.start_time;

-- 3) BAJA SEGURA — solo si NO hay reservas CONFIRMED en franjas sin servicio.
--    Borra las franjas futuras sin servicio y sin reservas, y luego las
--    plantillas sin servicio. Si hay conflictos, no borra nada y avisa.
DO $$
DECLARE
  v_conflicts int;
  v_slots     int;
  v_templates int;
BEGIN
  SELECT count(*) INTO v_conflicts
  FROM slots s
  JOIN bookings b ON b.slot_id = s.id AND b.status = 'CONFIRMED'
  WHERE s.service_id IS NULL
    AND s.date >= current_date;

  IF v_conflicts > 0 THEN
    RAISE NOTICE 'ABORTADO: % reserva(s) CONFIRMED en franjas sin servicio. No se borró nada; revisá el reporte (2).', v_conflicts;
    RETURN;
  END IF;

  DELETE FROM slots
  WHERE service_id IS NULL
    AND date >= current_date
    AND booked_count = 0;
  GET DIAGNOSTICS v_slots = ROW_COUNT;

  DELETE FROM slot_templates
  WHERE service_id IS NULL;
  GET DIAGNOSTICS v_templates = ROW_COUNT;

  RAISE NOTICE 'Limpieza OK: % franja(s) futura(s) y % plantilla(s) sin servicio eliminadas.', v_slots, v_templates;
END $$;
