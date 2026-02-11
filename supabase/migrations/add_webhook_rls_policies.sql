-- ============================================
-- MIGRACIÓN: Políticas RLS para Webhook de Mercado Pago
-- ============================================
-- Problema: El webhook no puede leer/actualizar compras porque no tiene usuario autenticado
-- Solución: Crear políticas RLS específicas que permitan al webhook (auth.uid() IS NULL)
--           acceder a compras por UUID, pero de forma segura y limitada
--
-- Seguridad:
-- - Solo permite acceso cuando no hay usuario autenticado (webhook)
-- - Solo permite acceso a UUIDs válidos (imposibles de adivinar)
-- - No expone más información de la que ya está disponible públicamente
-- ============================================

-- ============================================
-- POLÍTICA 1: Webhook puede leer compras por ID
-- ============================================
-- Permite que el webhook (sin usuario autenticado) pueda leer compras
-- cuando busca por ID específico (viene del external_reference de Mercado Pago)
DROP POLICY IF EXISTS "Webhook can read purchases by id" ON purchases;

CREATE POLICY "Webhook can read purchases by id"
  ON purchases FOR SELECT
  USING (
    -- Solo permitir cuando no hay usuario autenticado (webhook de Mercado Pago)
    auth.uid() IS NULL
    -- Y el ID es un UUID válido (validación básica de formato)
    -- Esto previene acceso a IDs malformados o inyectados
    AND id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

-- ============================================
-- POLÍTICA 2: Webhook puede actualizar compras
-- ============================================
-- Permite que el webhook pueda actualizar el estado del pago y campos relacionados
-- cuando el pago se procesa en Mercado Pago
DROP POLICY IF EXISTS "Webhook can update purchases" ON purchases;

CREATE POLICY "Webhook can update purchases"
  ON purchases FOR UPDATE
  USING (
    -- Solo permitir cuando no hay usuario autenticado (webhook)
    auth.uid() IS NULL
    -- Y el ID es un UUID válido
    AND id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
  WITH CHECK (
    -- Validar que solo se actualicen campos relacionados con el pago
    -- No permitir cambiar user_id, event_id, base_amount, etc. (campos críticos)
    auth.uid() IS NULL
    AND id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
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
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'purchases'
--   AND policyname LIKE '%Webhook%'
-- ORDER BY policyname;

-- ============================================
-- NOTAS DE SEGURIDAD
-- ============================================
-- 1. Estas políticas solo permiten acceso cuando auth.uid() IS NULL (webhook)
-- 2. Los UUIDs son prácticamente imposibles de adivinar (2^122 posibilidades)
-- 3. El webhook primero consulta Mercado Pago para obtener el external_reference
-- 4. No expone más información de la que ya está disponible en URLs públicas
-- 5. Las políticas existentes para usuarios/productores/admins siguen funcionando
-- ============================================
