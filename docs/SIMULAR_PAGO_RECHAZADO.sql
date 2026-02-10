-- ============================================
-- SCRIPT: Simular Pago Rechazado/Fallido
-- ============================================
-- Este script te permite forzar una compra a estado "failed"
-- para probar cómo se ve en la UI (Mis Compras)
-- ============================================

-- ============================================
-- PASO 1: Buscar una compra reciente para simular
-- ============================================

-- Ver las últimas 5 compras (elige una para simular)
SELECT 
  id,
  user_id,
  guest_email,
  total_amount,
  payment_status,
  event_id,
  created_at
FROM purchases
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- PASO 2: Actualizar la compra a estado "failed"
-- ============================================
-- ⚠️ IMPORTANTE: Reemplazá 'ID_DE_LA_COMPRA' con el ID real de la compra que elegiste
-- ============================================

-- Ejemplo: Actualizar compra a estado "failed" con diferentes motivos de rechazo

-- OPCIÓN A: Rechazo por fondos insuficientes
UPDATE purchases
SET 
  payment_status = 'failed',
  payment_provider_id = 'MP_' || floor(random() * 1000000000)::text,  -- ID simulado de MP
  payment_provider_data = jsonb_build_object(
    'status', 'rejected',
    'status_detail', 'cc_rejected_insufficient_amount',
    'status_detail_message', 'Fondos insuficientes en la tarjeta',
    'id', 'MP_' || floor(random() * 1000000000)::text,
    'transaction_amount', total_amount,
    'date_created', NOW()::text,
    'date_last_updated', NOW()::text
  ),
  updated_at = NOW()
WHERE id = 'ID_DE_LA_COMPRA'  -- ⚠️ REEMPLAZAR con el ID real
  AND payment_status IN ('pending', 'completed');  -- Solo actualizar si está pendiente o completada

-- OPCIÓN B: Rechazo por tarjeta inválida
UPDATE purchases
SET 
  payment_status = 'failed',
  payment_provider_id = 'MP_' || floor(random() * 1000000000)::text,
  payment_provider_data = jsonb_build_object(
    'status', 'rejected',
    'status_detail', 'cc_rejected_bad_filled_card_number',
    'status_detail_message', 'Número de tarjeta inválido',
    'id', 'MP_' || floor(random() * 1000000000)::text,
    'transaction_amount', total_amount,
    'date_created', NOW()::text,
    'date_last_updated', NOW()::text
  ),
  updated_at = NOW()
WHERE id = 'ID_DE_LA_COMPRA'  -- ⚠️ REEMPLAZAR con el ID real
  AND payment_status IN ('pending', 'completed');

-- OPCIÓN C: Rechazo por tarjeta vencida
UPDATE purchases
SET 
  payment_status = 'failed',
  payment_provider_id = 'MP_' || floor(random() * 1000000000)::text,
  payment_provider_data = jsonb_build_object(
    'status', 'rejected',
    'status_detail', 'cc_rejected_bad_filled_date',
    'status_detail_message', 'Tarjeta vencida',
    'id', 'MP_' || floor(random() * 1000000000)::text,
    'transaction_amount', total_amount,
    'date_created', NOW()::text,
    'date_last_updated', NOW()::text
  ),
  updated_at = NOW()
WHERE id = 'ID_DE_LA_COMPRA'  -- ⚠️ REEMPLAZAR con el ID real
  AND payment_status IN ('pending', 'completed');

-- OPCIÓN D: Pago cancelado por el usuario
UPDATE purchases
SET 
  payment_status = 'failed',
  payment_provider_id = 'MP_' || floor(random() * 1000000000)::text,
  payment_provider_data = jsonb_build_object(
    'status', 'cancelled',
    'status_detail', 'cc_rejected_call_for_authorize',
    'status_detail_message', 'Pago cancelado por el usuario',
    'id', 'MP_' || floor(random() * 1000000000)::text,
    'transaction_amount', total_amount,
    'date_created', NOW()::text,
    'date_last_updated', NOW()::text
  ),
  updated_at = NOW()
WHERE id = 'ID_DE_LA_COMPRA'  -- ⚠️ REEMPLAZAR con el ID real
  AND payment_status IN ('pending', 'completed');

-- ============================================
-- PASO 3: Verificar que se actualizó correctamente
-- ============================================

SELECT 
  id,
  total_amount,
  payment_status,
  payment_provider_id,
  payment_provider_data->>'status' as mp_status,
  payment_provider_data->>'status_detail' as mp_status_detail,
  payment_provider_data->>'status_detail_message' as mp_message,
  created_at,
  updated_at
FROM purchases
WHERE id = 'ID_DE_LA_COMPRA';  -- ⚠️ REEMPLAZAR con el ID real

-- ============================================
-- PASO 4: Asegurarse de que NO hay tickets válidos
-- ============================================
-- Si el pago falla, NO debería haber tickets válidos

-- Verificar tickets de la compra
SELECT 
  id,
  ticket_number,
  status,
  created_at
FROM tickets
WHERE purchase_id = 'ID_DE_LA_COMPRA'  -- ⚠️ REEMPLAZAR con el ID real
ORDER BY created_at;

-- Si hay tickets, marcarlos como 'refunded' o eliminarlos
-- (En un pago fallido, no deberían existir tickets)
UPDATE tickets
SET 
  status = 'refunded',
  updated_at = NOW()
WHERE purchase_id = 'ID_DE_LA_COMPRA'  -- ⚠️ REEMPLAZAR con el ID real
  AND status = 'valid';

-- ============================================
-- PASO 5: Verificar en la UI
-- ============================================
-- Después de ejecutar este script:
-- 1. Andá a /mis-compras en tu app
-- 2. Deberías ver la compra con estado "Fallido" o "Rechazado"
-- 3. Al expandir, deberías ver el motivo del rechazo (si está disponible)

-- ============================================
-- SCRIPT COMPLETO: Todo en uno (para copiar y pegar)
-- ============================================
-- Reemplazá 'ID_DE_LA_COMPRA' con el ID real de tu compra
-- ============================================

-- 1. Buscar compra reciente
SELECT 
  id,
  user_id,
  guest_email,
  total_amount,
  payment_status,
  event_id,
  created_at
FROM purchases
ORDER BY created_at DESC
LIMIT 5;

-- 2. Actualizar a "failed" (ejemplo: fondos insuficientes)
UPDATE purchases
SET 
  payment_status = 'failed',
  payment_provider_id = 'MP_' || floor(random() * 1000000000)::text,
  payment_provider_data = jsonb_build_object(
    'status', 'rejected',
    'status_detail', 'cc_rejected_insufficient_amount',
    'status_detail_message', 'Fondos insuficientes en la tarjeta',
    'id', 'MP_' || floor(random() * 1000000000)::text,
    'transaction_amount', total_amount,
    'date_created', NOW()::text,
    'date_last_updated', NOW()::text
  ),
  updated_at = NOW()
WHERE id = 'ID_DE_LA_COMPRA';  -- ⚠️ REEMPLAZAR

-- 3. Verificar
SELECT 
  id,
  payment_status,
  payment_provider_data->>'status' as mp_status,
  payment_provider_data->>'status_detail' as mp_status_detail,
  payment_provider_data->>'status_detail_message' as mp_message
FROM purchases
WHERE id = 'ID_DE_LA_COMPRA';  -- ⚠️ REEMPLAZAR

-- 4. Limpiar tickets (si existen)
UPDATE tickets
SET status = 'refunded', updated_at = NOW()
WHERE purchase_id = 'ID_DE_LA_COMPRA'  -- ⚠️ REEMPLAZAR
  AND status = 'valid';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Este script es SOLO para testing/desarrollo
-- 2. En producción, el webhook de Mercado Pago actualiza esto automáticamente
-- 3. Asegurate de reemplazar 'ID_DE_LA_COMPRA' con un ID real
-- 4. Después de ejecutar, verificá en /mis-compras cómo se ve
-- 5. Podés ejecutar diferentes opciones (A, B, C, D) para ver diferentes motivos de rechazo
