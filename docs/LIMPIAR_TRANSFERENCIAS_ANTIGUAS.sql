-- ============================================
-- Script para Limpiar Transferencias Antiguas
-- ============================================
-- 
-- Este script elimina transferencias que fueron creadas con el flujo anterior
-- (antes de que se implementara la creación en el webhook).
--
-- IMPORTANTE: Ejecutar en orden y verificar resultados antes de continuar
-- ============================================

-- ============================================
-- PASO 1: Verificar transferencias problemáticas
-- ============================================
-- Ejecutar primero para ver qué se va a eliminar

SELECT 
  t.id as transfer_id,
  t.status as transfer_status,
  t.created_at as transfer_created_at,
  p.id as purchase_id,
  p.payment_status as purchase_payment_status,
  p.created_at as purchase_created_at,
  CASE 
    WHEN p.payment_status = 'failed' THEN '❌ Debe eliminarse (pago fallido)'
    WHEN p.payment_status = 'pending' AND p.payment_provider_id IS NULL THEN '⚠️ Revisar (pago nunca procesado)'
    WHEN p.payment_status = 'pending' AND p.payment_provider_id IS NOT NULL THEN '⚠️ Revisar (pago pendiente)'
    WHEN p.payment_status = 'completed' THEN '✅ OK (pago exitoso)'
    WHEN p.payment_status = 'refunded' THEN '⚠️ Revisar (puede estar cancelled)'
    ELSE '❓ Estado desconocido'
  END as accion
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
ORDER BY t.created_at DESC;

-- ============================================
-- PASO 2: Eliminar transferencias de pagos fallidos
-- ============================================
-- Estas transferencias NO deberían existir con el nuevo flujo

DELETE FROM transfers
WHERE purchase_id IN (
  SELECT id FROM purchases WHERE payment_status = 'failed'
);

-- Verificar cuántas se eliminaron
SELECT COUNT(*) as eliminadas FROM transfers
WHERE purchase_id IN (
  SELECT id FROM purchases WHERE payment_status = 'failed'
);
-- Debe devolver 0

-- ============================================
-- PASO 3: Eliminar transferencias de compras sin payment_provider_id
-- ============================================
-- Si una compra nunca fue a Mercado Pago, no debería tener transferencia

DELETE FROM transfers
WHERE purchase_id IN (
  SELECT id FROM purchases 
  WHERE payment_provider_id IS NULL 
    AND payment_status = 'pending'
    AND created_at < NOW() - INTERVAL '1 day' -- Solo compras antiguas (más de 1 día)
);

-- ============================================
-- PASO 4: Verificar transferencias de pagos completados
-- ============================================
-- Estas transferencias deberían existir y estar en 'pending' o 'completed'

SELECT 
  t.id,
  t.status,
  t.amount,
  p.payment_status,
  p.payment_provider_id,
  t.created_at
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
WHERE p.payment_status = 'completed'
ORDER BY t.created_at DESC;

-- ============================================
-- PASO 5: Verificar transferencias de reembolsos
-- ============================================
-- Estas transferencias deberían estar en 'cancelled'

SELECT 
  t.id,
  t.status as transfer_status,
  p.payment_status as purchase_status,
  CASE 
    WHEN t.status = 'cancelled' THEN '✅ Correcto'
    ELSE '⚠️ Debe estar en cancelled'
  END as estado
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
WHERE p.payment_status = 'refunded';

-- Si hay transferencias de reembolsos que NO están en 'cancelled', corregirlas:
UPDATE transfers
SET status = 'cancelled', updated_at = NOW()
WHERE purchase_id IN (
  SELECT id FROM purchases WHERE payment_status = 'refunded'
)
AND status != 'cancelled';

-- ============================================
-- PASO 6: Resumen Final
-- ============================================

SELECT 
  COUNT(*) as total_transferencias,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pendientes,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completadas,
  COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as canceladas,
  COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as fallidas
FROM transfers t;

-- Verificar que todas las transferencias tienen compras válidas
SELECT 
  COUNT(*) as transferencias_sin_compra
FROM transfers t
LEFT JOIN purchases p ON t.purchase_id = p.id
WHERE p.id IS NULL;
-- Debe devolver 0

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
--
-- 1. Este script NO elimina transferencias de pagos exitosos
-- 2. Este script NO elimina compras (solo transferencias)
-- 3. Las transferencias de pagos completados se mantienen
-- 4. Las transferencias de reembolsos se marcan como 'cancelled'
-- 5. Ejecutar en orden y verificar resultados después de cada paso
--
-- ============================================
