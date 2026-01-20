-- ============================================
-- FIX: Recursión infinita en políticas RLS de profiles
-- ============================================
-- El problema: Las políticas de admin consultan profiles dentro de profiles
-- causando recursión infinita.
-- 
-- Solución: Usar una función con SECURITY DEFINER que evite las políticas RLS
-- al consultar el rol del usuario

-- ============================================
-- 1. CREAR FUNCIÓN HELPER PARA VERIFICAR ROL
-- ============================================

-- Función que obtiene el rol del usuario sin causar recursión
-- SECURITY DEFINER permite que la función ejecute sin restricciones RLS
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Consultar profiles directamente sin pasar por RLS
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. ACTUALIZAR POLÍTICAS DE PROFILES
-- ============================================

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Nueva política para admins (sin recursión)
-- Usa la función helper que tiene SECURITY DEFINER
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    get_user_role() = 'admin'
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    get_user_role() = 'admin'
  );

-- ============================================
-- 3. ACTUALIZAR POLÍTICAS DE PRODUCERS
-- ============================================

-- Las políticas de producers también consultan profiles
-- Actualizarlas para usar la función helper

DROP POLICY IF EXISTS "Admins can view all producers" ON producers;
CREATE POLICY "Admins can view all producers"
  ON producers FOR SELECT
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can manage producers" ON producers;
CREATE POLICY "Admins can manage producers"
  ON producers FOR ALL
  USING (get_user_role() = 'admin');

-- ============================================
-- ✅ FIN DEL FIX
-- ============================================
-- 
-- Verificación:
-- 1. Intenta actualizar un perfil a 'producer'
-- 2. No debería haber error de recursión
-- 3. Las políticas de admin deberían funcionar correctamente
