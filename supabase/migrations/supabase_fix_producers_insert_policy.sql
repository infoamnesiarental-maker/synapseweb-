-- ============================================
-- FIX: Política RLS para INSERT en producers
-- ============================================
-- El problema: No hay política que permita a usuarios crear su productora
-- 
-- Solución: Crear política que permita INSERT si:
-- 1. El usuario está autenticado
-- 2. El user_id del producer coincide con auth.uid()
-- 3. El usuario tiene role = 'producer' (o está en proceso de obtenerlo)
--
-- ⚠️ IMPORTANTE: Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. CREAR POLÍTICA PARA INSERT
-- ============================================

-- Política que permite a usuarios crear su propia productora
-- Solo si el user_id coincide con auth.uid() y tienen role = 'producer'
-- Usa get_user_role() para evitar recursión
DROP POLICY IF EXISTS "Users can create own producer" ON producers;
CREATE POLICY "Users can create own producer"
  ON producers FOR INSERT
  WITH CHECK (
    -- El user_id debe coincidir con el usuario autenticado
    user_id = auth.uid()
    AND
    -- El usuario debe tener role = 'producer' (ya actualizado en Stage1)
    -- Usamos get_user_role() para evitar recursión
    get_user_role() = 'producer'
  );

-- ============================================
-- ✅ FIN DEL FIX
-- ============================================
-- 
-- Verificación:
-- 1. Un usuario con role = 'producer' debería poder crear su producer
-- 2. El user_id debe coincidir con auth.uid()
-- 3. No debería haber error de RLS al crear
