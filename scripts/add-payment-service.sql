-- Vincula cada pago a un servicio (GYM, REHAB, etc.) para el desglose de
-- ingresos por servicio en Finanzas.
-- Los pagos anteriores quedan con service_id = NULL ("Sin servicio asignado").

ALTER TABLE payments ADD COLUMN service_id UUID REFERENCES services(id) ON DELETE SET NULL;
CREATE INDEX idx_payments_service ON payments(service_id);
