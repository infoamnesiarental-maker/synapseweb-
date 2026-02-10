-- ============================================
-- TEST 8: Pago Rechazado/Fallido - Queries SQL
-- ============================================

-- ============================================
-- PASO 1: Buscar TODAS las compras recientes
-- (Por si el webhook aún no actualizó el estado)
-- ============================================

-- Ver las últimas 10 compras (sin importar el estado)
SELECT 
  id,
  total_amount,
  payment_status,
  payment_provider_id,
  payment_provider_data->>'status' as mp_status,
  payment_provider_data->>'status_detail' as mp_status_detail,
  created_at,
  updated_at
FROM purchases
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- PASO 1B: Buscar compras con payment_status = 'pending'
-- (Puede que el webhook aún no haya llegado)
-- ============================================

SELECT 
  id,
  total_amount,
  payment_status,
  payment_provider_id,
  payment_provider_data->>'status' as mp_status,
  created_at,
  updated_at
FROM purchases
WHERE payment_status = 'pending'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- PASO 1C: Buscar compras rechazadas (si el webhook ya llegó)
-- ============================================

SELECT 
  id,
  total_amount,
  payment_status,
  payment_provider_id,
  payment_provider_data->>'status' as mp_status,
  payment_provider_data->>'status_detail' as mp_status_detail,
  created_at,
  updated_at
FROM purchases
WHERE payment_status = 'failed'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- PASO 2: Verificar la compra rechazada específica
-- ID de la compra rechazada: ba0e2389-fded-4976-8fa8-d0dc0fd38582
-- ============================================

-- Verificar detalles de la compra rechazada
SELECT 
  id,
  total_amount,
  payment_status,
  payment_provider_id,
  payment_provider_data->>'status' as mp_status,
  payment_provider_data->>'status_detail' as mp_status_detail,
  created_at,
  updated_at
FROM purchases
WHERE id = 'ba0e2389-fded-4976-8fa8-d0dc0fd38582';

-- ============================================
-- PASO 2B: Si el webhook no llegó, actualizar manualmente
-- (Solo para testing - en producción esto lo haría el webhook)
-- ============================================

-- ⚠️ IMPORTANTE: Ejecutá esto SOLO si el webhook no llegó después de 5-10 minutos
-- El webhook debería actualizar esto automáticamente

UPDATE purchases
SET 
  payment_status = 'failed',
  payment_provider_id = '145658531806',  -- ID de la operación en Mercado Pago
  payment_provider_data = jsonb_build_object(
    'status', 'rejected',
    'status_detail', 'cc_rejected_insufficient_amount',  -- O el motivo real del rechazo
    'id', '145658531806'
  ),
  updated_at = NOW()
WHERE id = 'ba0e2389-fded-4976-8fa8-d0dc0fd38582'
  AND payment_status = 'pending';  -- Solo actualizar si sigue en pending

-- Verificar que se actualizó correctamente
SELECT 
  id,
  payment_status,
  payment_provider_id,
  payment_provider_data->>'status' as mp_status,
  payment_provider_data->>'status_detail' as mp_status_detail,
  updated_at
FROM purchases
WHERE id = 'ba0e2389-fded-4976-8fa8-d0dc0fd38582';

-- ============================================
-- PASO 3: Verificar la transferencia asociada (si existe)
-- ============================================

-- Verificar estado de la transferencia
SELECT 
  t.id,
  t.status,
  t.amount,
  t.created_at,
  p.payment_status,
  p.id as purchase_id
FROM transfers t
JOIN purchases p ON t.purchase_id = p.id
WHERE p.id = 'ba0e2389-fded-4976-8fa8-d0dc0fd38582';

-- Actualizar transferencia a 'failed' si existe
UPDATE transfers
SET 
  status = 'failed',
  updated_at = NOW()
WHERE purchase_id = 'ba0e2389-fded-4976-8fa8-d0dc0fd38582'
  AND status = 'pending';

-- ============================================
-- PASO 4: Verificar que NO se generaron tickets válidos
-- ============================================

-- Verificar tickets de la compra rechazada
SELECT 
  id,
  ticket_number,
  status,
  created_at
FROM tickets
WHERE purchase_id = 'ba0e2389-fded-4976-8fa8-d0dc0fd38582'
ORDER BY created_at;

-- Verificar que NO hay tickets válidos (o que están en estado refunded si se crearon)
-- Si hay tickets, deberían estar en 'refunded' o no deberían existir

-- ============================================
-- QUERY ALTERNATIVA: Si querés ver TODAS las compras rechazadas
-- ============================================

SELECT 
  id,
  total_amount,
  payment_status,
  payment_provider_id,
  payment_provider_data->>'status' as mp_status,
  payment_provider_data->>'status_detail' as mp_status_detail,
  created_at,
  updated_at
FROM purchases
WHERE payment_status = 'failed'
ORDER BY created_at DESC;
