-- ============================================
-- MIGRACIÓN: Webhook Logs y Audit Logs
-- ============================================
-- Agrega tablas para idempotencia de webhooks y auditoría de cambios
-- 
-- Fecha: 2025
-- Versión: 1.0
-- ============================================

-- ============================================
-- 1. Tabla: webhook_logs (Idempotencia)
-- ============================================
-- Registra qué webhooks ya se procesaron para evitar duplicados

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT NOT NULL UNIQUE, -- ID del pago de Mercado Pago (único para idempotencia)
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL, -- 'payment', 'refund', etc.
  payment_status TEXT NOT NULL, -- Estado del pago cuando se procesó
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  webhook_data JSONB, -- Datos completos del webhook (para debugging)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para webhook_logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id ON webhook_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_purchase_id ON webhook_logs(purchase_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at);

-- ============================================
-- 2. Tabla: audit_logs (Auditoría)
-- ============================================
-- Registra todos los cambios importantes en el sistema

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'purchase', 'transfer', 'ticket', etc.
  entity_id UUID NOT NULL, -- ID de la entidad que cambió
  action TEXT NOT NULL, -- 'status_changed', 'created', 'updated', 'deleted'
  old_value JSONB, -- Valor anterior (opcional)
  new_value JSONB, -- Valor nuevo (opcional)
  changed_field TEXT, -- Campo específico que cambió (ej: 'payment_status')
  triggered_by TEXT NOT NULL, -- 'mercadopago_webhook', 'admin', 'user', 'system'
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Usuario que causó el cambio (si aplica)
  metadata JSONB, -- Información adicional (opcional)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_triggered_by ON audit_logs(triggered_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- 3. Políticas RLS para webhook_logs
-- ============================================

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs de webhooks (datos sensibles)
DROP POLICY IF EXISTS "Admins can view webhook logs" ON webhook_logs;
CREATE POLICY "Admins can view webhook logs"
  ON webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- El webhook puede insertar logs (sin autenticación, pero validado por el código)
DROP POLICY IF EXISTS "Webhook can insert logs" ON webhook_logs;
CREATE POLICY "Webhook can insert logs"
  ON webhook_logs FOR INSERT
  WITH CHECK (true);

-- Solo admins pueden actualizar logs
DROP POLICY IF EXISTS "Admins can update webhook logs" ON webhook_logs;
CREATE POLICY "Admins can update webhook logs"
  ON webhook_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 4. Políticas RLS para audit_logs
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs de auditoría (datos sensibles)
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- El sistema puede insertar logs (webhook, procesos internos)
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Solo admins pueden actualizar logs (por si hay que corregir algo)
DROP POLICY IF EXISTS "Admins can update audit logs" ON audit_logs;
CREATE POLICY "Admins can update audit logs"
  ON audit_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
--
-- 1. webhook_logs tiene UNIQUE constraint en payment_id para garantizar idempotencia
-- 2. Ambas tablas tienen RLS habilitado, solo admins pueden ver
-- 3. El webhook puede insertar en ambas tablas (WITH CHECK (true))
-- 4. Los índices mejoran el rendimiento de consultas
-- 5. Las tablas se relacionan con purchases para mantener integridad
--
-- ============================================
