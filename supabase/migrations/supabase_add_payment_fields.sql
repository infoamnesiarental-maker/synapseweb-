-- ============================================
-- MIGRACIÓN: Campos de pago y transferencias
-- ============================================
-- Agrega campos necesarios para el sistema de pagos MVP
-- y crea la tabla de transferencias a productoras

-- ============================================
-- 1. Agregar campos a purchases
-- ============================================

-- Comisión de Synapse (15% sobre precio base)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10, 2) DEFAULT 0;

-- Costos de procesamiento (8% estimado)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS processing_costs DECIMAL(10, 2) DEFAULT 0;

-- Precio base de la productora (sin comisiones)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10, 2) DEFAULT 0;

-- Evento relacionado (para facilitar consultas)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Índice para consultas por evento
CREATE INDEX IF NOT EXISTS idx_purchases_event ON purchases(event_id);

-- ============================================
-- 2. Crear tabla transfers (transferencias a productoras)
-- ============================================

CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL, -- Monto a transferir (precio base de productora)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  transfer_method TEXT CHECK (transfer_method IN ('mercadopago', 'bank_transfer', 'manual')),
  transfer_reference TEXT, -- Referencia de la transferencia
  transfer_data JSONB, -- Datos adicionales de la transferencia
  scheduled_at TIMESTAMPTZ, -- Cuándo se debe transferir
  transferred_at TIMESTAMPTZ, -- Cuándo se transfirió realmente
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para transfers
CREATE INDEX IF NOT EXISTS idx_transfers_purchase ON transfers(purchase_id);
CREATE INDEX IF NOT EXISTS idx_transfers_event ON transfers(event_id);
CREATE INDEX IF NOT EXISTS idx_transfers_producer ON transfers(producer_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_scheduled ON transfers(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Trigger para updated_at
CREATE TRIGGER update_transfers_updated_at 
  BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Políticas RLS para transfers
-- ============================================

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- Productoras pueden ver transferencias de sus eventos
DROP POLICY IF EXISTS "Producers can view own transfers" ON transfers;
CREATE POLICY "Producers can view own transfers"
  ON transfers FOR SELECT
  USING (
    producer_id IN (
      SELECT p.id FROM producers p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

-- Admins pueden ver todas las transferencias
DROP POLICY IF EXISTS "Admins can view all transfers" ON transfers;
CREATE POLICY "Admins can view all transfers"
  ON transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins pueden gestionar transferencias
DROP POLICY IF EXISTS "Admins can manage transfers" ON transfers;
CREATE POLICY "Admins can manage transfers"
  ON transfers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
