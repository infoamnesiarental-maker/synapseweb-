-- ============================================
-- FIX: Agregar política INSERT para transfers
-- ============================================
-- Problema: No había política para INSERT en transfers, causando error 403
-- Solución: Permitir crear transferencias cuando se crea una compra
-- ============================================

-- Permitir que usuarios autenticados creen transferencias
-- Esto se necesita cuando un usuario completa una compra y se crea la transferencia automáticamente
-- Es seguro porque:
-- 1. Solo usuarios autenticados pueden hacer compras
-- 2. La transferencia se crea automáticamente cuando se crea la compra
-- 3. Las transferencias solo se pueden ver por productoras y admins (ya está protegido con SELECT)
DROP POLICY IF EXISTS "Authenticated users can create transfers" ON transfers;
CREATE POLICY "Authenticated users can create transfers"
  ON transfers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
