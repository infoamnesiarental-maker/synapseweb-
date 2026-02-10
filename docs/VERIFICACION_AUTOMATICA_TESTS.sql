-- ============================================
-- VERIFICACIÓN AUTOMÁTICA DE TESTS CRÍTICOS
-- ============================================
-- Este script verifica los tests más importantes sin necesidad de hacer pagos reales
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- TEST 0: Verificar que las migraciones se aplicaron
-- ============================================

-- Verificar que las tablas existen
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_logs') 
    THEN '✅ webhook_logs existe'
    ELSE '❌ webhook_logs NO existe'
  END as tabla_webhook_logs,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') 
    THEN '✅ audit_logs existe'
    ELSE '❌ audit_logs NO existe'
  END as tabla_audit_logs,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transfers') 
    THEN '✅ transfers existe'
    ELSE '❌ transfers NO existe'
  END as tabla_transfers;

-- Verificar estructura de webhook_logs
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'webhook_logs'
ORDER BY ordinal_position;

-- Verificar estructura de audit_logs
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- ============================================
-- TEST 1: Verificar RLS Policies
-- ============================================

-- Verificar RLS habilitado
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ACTIVO'
    ELSE '❌ RLS DESACTIVADO'
  END as estado_rls
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('webhook_logs', 'audit_logs', 'purchases', 'transfers')
ORDER BY tablename;

-- Verificar políticas RLS de webhook_logs
SELECT 
  policyname,
  cmd as operacion,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Política configurada'
    ELSE '⚠️ Política sin condiciones'
  END as estado
FROM pg_policies 
WHERE tablename = 'webhook_logs'
ORDER BY policyname;

-- Verificar políticas RLS de audit_logs
SELECT 
  policyname,
  cmd as operacion,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Política configurada'
    ELSE '⚠️ Política sin condiciones'
  END as estado
FROM pg_policies 
WHERE tablename = 'audit_logs'
ORDER BY policyname;

-- ============================================
-- TEST 2: Verificar Integridad de Datos
-- ============================================

-- Verificar que no hay compras con payment_status='completed' sin transferencia
SELECT 
  COUNT(*) as compras_sin_transferencia,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todas las compras completadas tienen transferencia'
    ELSE '❌ Hay compras completadas sin transferencia'
  END as resultado
FROM purchases p
WHERE p.payment_status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM transfers t WHERE t.purchase_id = p.id
  );

-- Verificar que no hay transferencias de compras fallidas
SELECT 
  COUNT(*) as transferencias_fallidas,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No hay transferencias de compras fallidas'
    ELSE '❌ Hay transferencias de compras fallidas (ERROR)'
  END as resultado
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
WHERE p.payment_status = 'failed';

-- Verificar que no hay tickets de compras fallidas
SELECT 
  COUNT(*) as tickets_fallidos,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No hay tickets de compras fallidas'
    ELSE '❌ Hay tickets de compras fallidas (ERROR)'
  END as resultado
FROM tickets t
INNER JOIN purchases p ON t.purchase_id = p.id
WHERE p.payment_status = 'failed';

-- Verificar que no hay compras con payment_status='completed' sin tickets
SELECT 
  COUNT(*) as compras_sin_tickets,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todas las compras completadas tienen tickets'
    ELSE '⚠️ Hay compras completadas sin tickets (puede ser legítimo si falló la creación)'
  END as resultado
FROM purchases p
WHERE p.payment_status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM tickets t WHERE t.purchase_id = p.id
  );

-- ============================================
-- TEST 3: Verificar Idempotencia
-- ============================================

-- Verificar que no hay webhooks duplicados (mismo payment_id procesado múltiples veces)
SELECT 
  payment_id,
  COUNT(*) as veces_procesado,
  CASE 
    WHEN COUNT(*) > 1 THEN '❌ Webhook procesado múltiples veces (ERROR)'
    ELSE '✅ Webhook procesado una sola vez'
  END as resultado
FROM webhook_logs
GROUP BY payment_id
HAVING COUNT(*) > 1;

-- Verificar que todos los payment_id son únicos
SELECT 
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT payment_id) THEN '✅ Todos los payment_id son únicos'
    ELSE '❌ Hay payment_id duplicados (ERROR)'
  END as resultado
FROM webhook_logs;

-- ============================================
-- TEST 4: Verificar Auditoría
-- ============================================

-- Verificar que hay registros de auditoría para cambios de estado
SELECT 
  COUNT(*) as registros_auditoria,
  COUNT(DISTINCT entity_id) as compras_auditadas,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Hay registros de auditoría'
    ELSE '⚠️ No hay registros de auditoría (puede ser normal si no hubo cambios)'
  END as resultado
FROM audit_logs
WHERE entity_type = 'purchase' 
  AND action = 'status_changed';

-- Verificar que los cambios de estado tienen old_value y new_value
SELECT 
  COUNT(*) as cambios_sin_valores,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todos los cambios tienen old_value y new_value'
    ELSE '⚠️ Hay cambios sin old_value o new_value'
  END as resultado
FROM audit_logs
WHERE entity_type = 'purchase' 
  AND action = 'status_changed'
  AND (old_value IS NULL OR new_value IS NULL);

-- ============================================
-- TEST 5: Verificar Transferencias
-- ============================================

-- Verificar que las transferencias tienen el monto correcto (base_amount)
SELECT 
  t.id,
  t.amount as transfer_amount,
  p.base_amount as purchase_base_amount,
  CASE 
    WHEN t.amount = p.base_amount THEN '✅ Monto correcto'
    ELSE '❌ Monto incorrecto'
  END as validacion_monto
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
WHERE p.payment_status = 'completed'
LIMIT 10;

-- Verificar que las transferencias tienen scheduled_at correcto (240 horas después)
SELECT 
  t.id,
  t.scheduled_at,
  p.created_at as purchase_created_at,
  EXTRACT(EPOCH FROM (t.scheduled_at - p.created_at)) / 3600 as horas_diferencia,
  CASE 
    WHEN ABS(EXTRACT(EPOCH FROM (t.scheduled_at - p.created_at)) / 3600 - 240) < 1 THEN '✅ Fecha correcta (240 horas)'
    ELSE '❌ Fecha incorrecta'
  END as validacion_fecha
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
WHERE p.payment_status = 'completed'
LIMIT 10;

-- Verificar que las transferencias de reembolsos están canceladas
SELECT 
  COUNT(*) as transferencias_reembolsadas_sin_cancelar,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todas las transferencias de reembolsos están canceladas'
    ELSE '❌ Hay transferencias de reembolsos sin cancelar (ERROR)'
  END as resultado
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
WHERE p.payment_status = 'refunded'
  AND t.status != 'cancelled';

-- ============================================
-- TEST 6: Verificar Protección de Datos (RLS)
-- ============================================

-- Verificar que las vistas públicas no exponen datos sensibles
SELECT 
  column_name
FROM information_schema.columns
WHERE table_name = 'purchases_public'
  AND column_name IN ('operating_costs', 'net_margin', 'mercadopago_commission', 'iva_commission', 'iibb_retention', 'net_amount', 'money_release_date', 'settlement_status');

-- Resultado esperado: 0 filas (no debe haber campos sensibles en la vista pública)

-- Verificar que la vista admin existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'purchases_admin') 
    THEN '✅ Vista admin existe'
    ELSE '❌ Vista admin NO existe'
  END as vista_admin;

-- ============================================
-- TEST 7: Estadísticas Generales
-- ============================================

-- Resumen de compras por estado
SELECT 
  payment_status,
  COUNT(*) as cantidad,
  SUM(total_amount) as total_monto
FROM purchases
GROUP BY payment_status
ORDER BY payment_status;

-- Resumen de transferencias por estado
SELECT 
  status,
  COUNT(*) as cantidad,
  SUM(amount) as total_monto
FROM transfers
GROUP BY status
ORDER BY status;

-- Resumen de webhooks procesados
SELECT 
  payment_status,
  COUNT(*) as cantidad,
  MIN(processed_at) as primer_webhook,
  MAX(processed_at) as ultimo_webhook
FROM webhook_logs
GROUP BY payment_status
ORDER BY payment_status;

-- Resumen de auditoría
SELECT 
  action,
  triggered_by,
  COUNT(*) as cantidad
FROM audit_logs
GROUP BY action, triggered_by
ORDER BY action, triggered_by;

-- ============================================
-- TEST 8: Verificar Constraints y Índices
-- ============================================

-- Verificar que payment_id tiene UNIQUE constraint en webhook_logs
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'webhook_logs' 
  AND constraint_type = 'UNIQUE';

-- Verificar índices importantes
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('webhook_logs', 'audit_logs', 'transfers')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- RESUMEN FINAL
-- ============================================

SELECT 
  '✅ Verificación completada' as estado,
  NOW() as fecha_verificacion;
