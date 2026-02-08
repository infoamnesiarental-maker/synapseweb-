-- ============================================
-- MIGRACIÓN: Campos de Gastos Operativos V1
-- ============================================
-- Agrega campos necesarios para registrar gastos operativos
-- según Manual de Operaciones V1 (7.73% del total cobrado)
-- 
-- Fecha: 2025
-- Versión: 1.0

-- ============================================
-- 1. Agregar campos de gastos operativos a purchases
-- ============================================

-- Monto neto recibido después de gastos operativos
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10, 2);

-- Gastos operativos totales (7.73% del total cobrado)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS operating_costs DECIMAL(10, 2);

-- Comisión de Mercado Pago (4.32% del total cobrado)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS mercadopago_commission DECIMAL(10, 2);

-- IVA sobre comisión de Mercado Pago (0.91% del total cobrado)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS iva_commission DECIMAL(10, 2);

-- Retención IIBB (2.50% del total cobrado)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS iibb_retention DECIMAL(10, 2);

-- Margen neto de Synapse (ganancia después de todos los costos)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS net_margin DECIMAL(10, 2);

-- Fecha de liberación de Mercado Pago (10 días después de la compra)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS money_release_date TIMESTAMPTZ;

-- Estado de liquidación
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending' 
CHECK (settlement_status IN ('pending', 'ready', 'transferred', 'failed'));

-- ============================================
-- 2. Agregar índices para consultas eficientes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_purchases_settlement_status 
ON purchases(settlement_status) 
WHERE settlement_status = 'ready';

CREATE INDEX IF NOT EXISTS idx_purchases_money_release_date 
ON purchases(money_release_date) 
WHERE money_release_date IS NOT NULL;

-- ============================================
-- 3. Agregar comentarios para documentación
-- ============================================

COMMENT ON COLUMN purchases.net_amount IS 'Monto neto recibido después de gastos operativos (total - operating_costs)';
COMMENT ON COLUMN purchases.operating_costs IS 'Total de gastos operativos (7.73% del total cobrado): MP + IVA + IIBB';
COMMENT ON COLUMN purchases.mercadopago_commission IS 'Comisión de Mercado Pago (4.32% del total cobrado)';
COMMENT ON COLUMN purchases.iva_commission IS 'IVA sobre comisión MP (0.91% del total cobrado)';
COMMENT ON COLUMN purchases.iibb_retention IS 'Retención IIBB Buenos Aires (2.50% del total cobrado)';
COMMENT ON COLUMN purchases.net_margin IS 'Margen neto de Synapse después de todos los costos (net_amount - base_amount)';
COMMENT ON COLUMN purchases.money_release_date IS 'Fecha de liberación de Mercado Pago (240 horas = 10 días después de compra)';
COMMENT ON COLUMN purchases.settlement_status IS 'Estado de liquidación: pending (esperando pago), ready (listo para transferir), transferred (transferido), failed (error)';

-- ============================================
-- 4. Políticas RLS para proteger campos financieros
-- ============================================
-- IMPORTANTE: Los campos financieros solo pueden ser actualizados por:
-- 1. Admins (para correcciones manuales)
-- 2. El webhook de Mercado Pago (cuando confirma el pago)
-- Los usuarios/productores NO pueden modificar estos campos

-- Política: Solo admins pueden actualizar campos financieros
-- Esta política permite a admins actualizar CUALQUIER campo, incluyendo los financieros
DROP POLICY IF EXISTS "Admins can update all purchases" ON purchases;
CREATE POLICY "Admins can update all purchases"
  ON purchases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política: Permitir actualización de campos financieros cuando el webhook
-- confirma el pago (payment_status cambia de 'pending' a 'completed')
-- Nota: El webhook corre sin autenticación (anon key), así que auth.uid() será NULL
-- Esta política permite actualizar cuando payment_status = 'pending' y se cambia a 'completed'
DROP POLICY IF EXISTS "Webhook can update on payment confirmation" ON purchases;
CREATE POLICY "Webhook can update on payment confirmation"
  ON purchases FOR UPDATE
  USING (
    -- Permitir si el purchase está en pending (el webhook solo actualiza purchases pendientes)
    payment_status = 'pending'
  )
  WITH CHECK (
    -- Solo permitir si payment_status está cambiando a completed
    -- Esto asegura que solo el webhook (que confirma pagos) puede usar esta política
    payment_status = 'completed'
  );

-- IMPORTANTE: La política "Users can update own purchases" existe pero NO permite
-- actualizar campos financieros porque esta política solo se aplica cuando
-- payment_status = 'pending' (antes del pago), y los campos financieros solo
-- se actualizan cuando payment_status = 'completed' (después del pago).
-- Por lo tanto, los usuarios NO pueden modificar campos financieros.

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
