-- ============================================
-- Script para Eliminar TODAS las Compras y Transferencias
-- ============================================
-- 
-- ⚠️ ADVERTENCIA: Este script elimina TODAS las compras y todo lo relacionado
-- Solo usar si querés empezar de cero (antes de producción)
-- 
-- Este script elimina:
-- - Refunds (devoluciones) - tienen CASCADE con purchases
-- - Tickets - tienen CASCADE con purchases
-- - Transfers (transferencias) - tienen CASCADE con purchases
-- - Purchases (compras)
-- 
-- Este script NO elimina:
-- - Eventos (events)
-- - Tipos de tickets (ticket_types) - pero resetea quantity_sold
-- - Productoras (producers)
-- - Usuarios (profiles)
-- ============================================

-- ============================================
-- PASO 1: Verificar qué se va a eliminar
-- ============================================
SELECT 
  'Refunds' as tabla,
  COUNT(*) as cantidad
FROM refunds
UNION ALL
SELECT 
  'Tickets' as tabla,
  COUNT(*) as cantidad
FROM tickets
UNION ALL
SELECT 
  'Transfers' as tabla,
  COUNT(*) as cantidad
FROM transfers
UNION ALL
SELECT 
  'Purchases' as tabla,
  COUNT(*) as cantidad
FROM purchases;

-- Ver detalle de compras
SELECT 
  payment_status,
  COUNT(*) as cantidad
FROM purchases
GROUP BY payment_status;

-- ============================================
-- PASO 2: Resetear quantity_sold en ticket_types
-- ============================================
-- IMPORTANTE: Antes de eliminar tickets, resetear la cantidad vendida
-- para que los tickets vuelvan a estar disponibles

UPDATE ticket_types
SET quantity_sold = 0;

-- Verificar que se reseteó
SELECT 
  id,
  name,
  quantity_available,
  quantity_sold,
  (quantity_available - quantity_sold) as disponibles
FROM ticket_types
ORDER BY name;

-- ============================================
-- PASO 3: Eliminar Refunds (devoluciones)
-- ============================================
-- Se eliminan primero porque referencian purchases
-- (aunque tienen CASCADE, es mejor ser explícito)

DELETE FROM refunds;

-- Verificar que se eliminaron
SELECT COUNT(*) as refunds_restantes FROM refunds;
-- Debe devolver 0

-- ============================================
-- PASO 4: Eliminar Tickets
-- ============================================
-- Se eliminan antes de purchases
-- (aunque tienen CASCADE, es mejor ser explícito)

DELETE FROM tickets;

-- Verificar que se eliminaron
SELECT COUNT(*) as tickets_restantes FROM tickets;
-- Debe devolver 0

-- ============================================
-- PASO 5: Eliminar Transfers (transferencias)
-- ============================================
-- Se eliminan antes de purchases
-- (aunque tienen CASCADE, es mejor ser explícito)

DELETE FROM transfers;

-- Verificar que se eliminaron
SELECT COUNT(*) as transfers_restantes FROM transfers;
-- Debe devolver 0

-- ============================================
-- PASO 6: Eliminar Purchases (compras)
-- ============================================
-- ⚠️ ESTE ES EL COMANDO PRINCIPAL QUE ELIMINA LAS COMPRAS

DELETE FROM purchases;

-- Verificar que se eliminaron
SELECT COUNT(*) as purchases_restantes FROM purchases;
-- Debe devolver 0

-- ============================================
-- PASO 7: Verificar que todo se eliminó correctamente
-- ============================================
SELECT 
  'Refunds' as tabla,
  COUNT(*) as cantidad_restante
FROM refunds
UNION ALL
SELECT 
  'Tickets' as tabla,
  COUNT(*) as cantidad_restante
FROM tickets
UNION ALL
SELECT 
  'Transfers' as tabla,
  COUNT(*) as cantidad_restante
FROM transfers
UNION ALL
SELECT 
  'Purchases' as tabla,
  COUNT(*) as cantidad_restante
FROM purchases;
-- Todas deben devolver 0

-- ============================================
-- PASO 8: Verificar que otros datos siguen intactos
-- ============================================
-- Verificar eventos
SELECT 
  COUNT(*) as total_eventos,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as eventos_publicados
FROM events;

-- Verificar ticket_types (deben tener quantity_sold = 0)
SELECT 
  COUNT(*) as total_ticket_types,
  COUNT(CASE WHEN quantity_sold = 0 THEN 1 END) as con_stock_disponible,
  COUNT(CASE WHEN quantity_sold > 0 THEN 1 END) as con_stock_vendido
FROM ticket_types;
-- "con_stock_vendido" debe ser 0

-- Verificar productoras
SELECT COUNT(*) as total_productoras FROM producers;

-- Verificar usuarios
SELECT COUNT(*) as total_usuarios FROM profiles;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
--
-- 1. Este script elimina TODAS las compras y todo lo relacionado
-- 2. Los eventos NO se eliminan
-- 3. Los ticket_types NO se eliminan, pero se resetea quantity_sold
-- 4. Las productoras NO se eliminan
-- 5. Los usuarios NO se eliminan
-- 6. Cuando proceses nuevos pagos, se crearán nuevas compras y transferencias automáticamente
-- 7. Es seguro ejecutar antes de producción (cuando no hay datos reales)
-- 8. Los tickets vuelven a estar disponibles (quantity_sold = 0)
--
-- ============================================
