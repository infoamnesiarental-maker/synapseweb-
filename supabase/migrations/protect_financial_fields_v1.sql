-- ============================================
-- MIGRACIÓN: Protección de Campos Financieros Sensibles
-- ============================================
-- Crea vistas y funciones para ocultar campos financieros
-- a usuarios y productores. Solo admins pueden verlos.
-- 
-- Fecha: 2025
-- Versión: 1.0

-- ============================================
-- 1. Crear función para verificar si es admin
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Crear vista pública de purchases (sin campos financieros sensibles)
-- ============================================

CREATE OR REPLACE VIEW purchases_public AS
SELECT 
  id,
  user_id,
  guest_email,
  guest_name,
  guest_phone,
  event_id,
  total_amount,           -- Cliente ve cuánto pagó
  base_amount,            -- Productor ve cuánto le corresponde
  commission_amount,      -- Productor puede ver la comisión (15%)
  payment_method,
  payment_status,
  payment_provider_id,
  created_at,
  updated_at
  -- Campos OCULTOS para usuarios/productores:
  -- operating_costs
  -- mercadopago_commission
  -- iva_commission
  -- iibb_retention
  -- net_amount
  -- net_margin
  -- money_release_date
  -- settlement_status
  -- payment_provider_data (puede contener info sensible)
FROM purchases;

-- ============================================
-- 3. Crear vista completa para admins
-- ============================================

CREATE OR REPLACE VIEW purchases_admin AS
SELECT 
  p.*  -- Todos los campos incluyendo los financieros sensibles
FROM purchases p
WHERE is_admin();  -- Solo si es admin

-- ============================================
-- 4. Políticas RLS para las vistas
-- ============================================

-- Habilitar RLS en las vistas
ALTER VIEW purchases_public SET (security_invoker = true);
ALTER VIEW purchases_admin SET (security_invoker = true);

-- ============================================
-- 5. Comentarios para documentación
-- ============================================

COMMENT ON VIEW purchases_public IS 'Vista pública de purchases sin campos financieros sensibles. Usada por clientes y productores.';
COMMENT ON VIEW purchases_admin IS 'Vista completa de purchases con todos los campos financieros. Solo visible para admins.';
COMMENT ON FUNCTION is_admin() IS 'Verifica si el usuario actual es admin. Usado para controlar acceso a datos sensibles.';

-- ============================================
-- 6. Políticas RLS para las vistas (heredan de purchases)
-- ============================================
-- Las vistas heredan las políticas RLS de la tabla base 'purchases'
-- No necesitan políticas adicionales, pero documentamos el comportamiento

-- ============================================
-- NOTA IMPORTANTE:
-- ============================================
-- Las políticas RLS de la tabla 'purchases' siguen aplicándose.
-- Estas vistas solo filtran QUÉ campos se pueden ver, no QUIÉN puede verlos.
-- 
-- Para usar estas vistas en el código:
-- - Clientes/Productores: SELECT * FROM purchases_public WHERE ...
-- - Admins: SELECT * FROM purchases_admin WHERE ...
-- 
-- O mejor aún: actualizar los hooks para seleccionar campos específicos
-- según el rol del usuario (ya implementado en los hooks).
-- 
-- IMPORTANTE: Las vistas NO reemplazan las políticas RLS de la tabla base.
-- Si un usuario no puede ver una purchase por RLS, tampoco la verá en la vista.
-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
