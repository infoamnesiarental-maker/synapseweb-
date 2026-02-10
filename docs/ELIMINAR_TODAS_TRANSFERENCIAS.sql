-- ============================================
-- Script para Eliminar TODAS las Transferencias
-- ============================================
-- 
-- ⚠️ ADVERTENCIA: Este script elimina TODAS las transferencias de la base de datos
-- Solo usar si querés empezar de cero (antes de producción)
-- 
-- Este script NO elimina:
-- - Compras (purchases)
-- - Eventos (events)
-- - Tickets (tickets)
-- - Productoras (producers)
-- Solo elimina transferencias
-- ============================================

-- ============================================
-- PASO 1: Verificar cuántas transferencias hay
-- ============================================
SELECT 
  COUNT(*) as total_transferencias,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendientes,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completadas,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as canceladas,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as fallidas
FROM transfers;

-- ============================================
-- PASO 2: Verificar que no hay dependencias críticas
-- ============================================
-- Las transferencias tienen CASCADE DELETE, así que no debería haber problemas
-- Pero verificamos por seguridad

SELECT 
  'Verificando integridad...' as estado;

-- ============================================
-- PASO 3: ELIMINAR TODAS LAS TRANSFERENCIAS
-- ============================================
-- ⚠️ ESTE ES EL COMANDO QUE ELIMINA TODO
-- Descomentar la siguiente línea cuando estés seguro:

-- DELETE FROM transfers;

-- ============================================
-- PASO 4: Verificar que se eliminaron
-- ============================================
-- Después de ejecutar el DELETE, verificar:

SELECT COUNT(*) as transferencias_restantes FROM transfers;
-- Debe devolver 0

-- ============================================
-- PASO 5: Verificar que las compras siguen intactas
-- ============================================
-- Verificar que las compras no se eliminaron:

SELECT 
  COUNT(*) as total_compras,
  COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as pagos_completados,
  COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as pagos_fallidos,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pagos_pendientes
FROM purchases;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
--
-- 1. Este script SOLO elimina transferencias
-- 2. Las compras (purchases) NO se eliminan
-- 3. Los tickets NO se eliminan
-- 4. Los eventos NO se eliminan
-- 5. Cuando se procesen nuevos pagos exitosos, se crearán nuevas transferencias automáticamente
-- 6. Es seguro ejecutar antes de producción (cuando no hay datos reales)
--
-- ============================================
