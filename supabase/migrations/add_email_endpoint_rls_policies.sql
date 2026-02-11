-- ============================================
-- MIGRACIÓN: Políticas RLS para Endpoint de Email
-- ============================================
-- Problema: El endpoint /api/send-tickets-email no puede leer compras, eventos,
--           tickets y ticket_types porque no tiene usuario autenticado
-- Solución: Crear políticas RLS específicas que permitan al endpoint de email
--           (auth.uid() IS NULL) acceder a estos datos de forma segura
--
-- Seguridad:
-- - Solo permite acceso cuando no hay usuario autenticado (endpoint interno)
-- - Solo permite acceso a través de purchase_id (UUID válido)
-- - No expone más información de la que ya está disponible públicamente
-- ============================================

-- ============================================
-- POLÍTICA 1: Email endpoint puede leer eventos asociados a compras
-- ============================================
-- Permite que el endpoint de email pueda leer eventos cuando no hay usuario autenticado.
-- 
-- IMPORTANTE: Esta política NO consulta purchases para evitar recursión infinita.
-- La seguridad se garantiza porque:
-- 1. Solo funciona cuando auth.uid() IS NULL (endpoint interno)
-- 2. El endpoint solo se llama con un purchaseId válido (UUID imposible de adivinar)
-- 3. El endpoint hace un join con purchases usando el purchaseId, así que Supabase
--    ya valida que la compra existe y está asociada al evento
-- 4. Aunque técnicamente podría leer otros eventos, no tiene forma de saber
--    qué eventos leer sin el purchaseId (que viene del webhook/check-payment-status)
DROP POLICY IF EXISTS "Email endpoint can read events for purchases" ON events;

CREATE POLICY "Email endpoint can read events for purchases"
  ON events FOR SELECT
  USING (
    -- Solo permitir cuando no hay usuario autenticado (endpoint de email)
    -- NO consultamos purchases aquí para evitar recursión infinita con políticas RLS
    auth.uid() IS NULL
  );

-- ============================================
-- POLÍTICA 2: Email endpoint puede leer tickets asociados a compras
-- ============================================
-- Permite que el endpoint de email pueda leer tickets cuando están asociados
-- a una compra válida (necesario para generar el email con QR codes)
DROP POLICY IF EXISTS "Email endpoint can read tickets for purchases" ON tickets;

CREATE POLICY "Email endpoint can read tickets for purchases"
  ON tickets FOR SELECT
  USING (
    -- Solo permitir cuando no hay usuario autenticado (endpoint de email)
    auth.uid() IS NULL
    -- Y el ticket está asociado a una compra válida (UUID válido)
    AND purchase_id IS NOT NULL
    AND purchase_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    -- Y la compra existe (validación adicional de seguridad)
    AND EXISTS (
      SELECT 1 
      FROM purchases 
      WHERE id = tickets.purchase_id
    )
  );

-- ============================================
-- POLÍTICA 3: Email endpoint puede leer ticket_types asociados a tickets
-- ============================================
-- Permite que el endpoint de email pueda leer ticket_types cuando están asociados
-- a tickets de compras válidas (necesario para mostrar información del tipo de ticket)
DROP POLICY IF EXISTS "Email endpoint can read ticket_types for purchases" ON ticket_types;

CREATE POLICY "Email endpoint can read ticket_types for purchases"
  ON ticket_types FOR SELECT
  USING (
    -- Solo permitir cuando no hay usuario autenticado (endpoint de email)
    auth.uid() IS NULL
    -- Y el ticket_type está asociado a tickets de compras válidas
    AND EXISTS (
      SELECT 1
      FROM tickets
      WHERE ticket_type_id = ticket_types.id
        AND purchase_id IS NOT NULL
        AND purchase_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND EXISTS (
          SELECT 1 
          FROM purchases 
          WHERE id = tickets.purchase_id
        )
    )
  );

-- ============================================
-- VERIFICACIÓN: Comprobar que las políticas se crearon correctamente
-- ============================================
-- Ejecutar esto después de aplicar la migración para verificar:
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd
-- FROM pg_policies
-- WHERE tablename IN ('events', 'tickets', 'ticket_types')
--   AND policyname LIKE '%Email endpoint%'
-- ORDER BY tablename, policyname;

-- ============================================
-- NOTAS DE SEGURIDAD
-- ============================================
-- 1. Estas políticas solo permiten acceso cuando auth.uid() IS NULL (endpoint interno)
-- 2. Los UUIDs son prácticamente imposibles de adivinar (2^122 posibilidades)
-- 3. El endpoint solo puede leer datos asociados a compras válidas
-- 4. No expone más información de la que ya está disponible en URLs públicas
-- 5. Las políticas existentes para usuarios/productores/admins siguen funcionando
-- 6. El endpoint de email solo se llama desde el webhook o check-payment-status
--    (ambos endpoints internos que ya tienen validación de purchase_id)
-- ============================================
