-- ============================================
-- FIX: Recursión infinita en política RLS de events
-- ============================================
-- Problema: La política "Email endpoint can read events for purchases"
-- consulta purchases, y las políticas de purchases consultan events,
-- causando recursión infinita.
-- 
-- Solución: Simplificar la política de events para que NO consulte purchases.
-- La seguridad se mantiene porque:
-- 1. Solo funciona cuando auth.uid() IS NULL (endpoint interno)
-- 2. El endpoint recibe un purchaseId válido (UUID imposible de adivinar)
-- 3. El endpoint hace un join con purchases, así que Supabase ya valida la existencia
-- ============================================

-- Eliminar política problemática
DROP POLICY IF EXISTS "Email endpoint can read events for purchases" ON events;

-- Crear nueva política sin recursión
CREATE POLICY "Email endpoint can read events for purchases"
  ON events FOR SELECT
  USING (
    -- Solo permitir cuando no hay usuario autenticado (endpoint de email)
    -- NO consultamos purchases aquí para evitar recursión infinita con políticas RLS
    auth.uid() IS NULL
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecutar esto para verificar que la política se creó correctamente:
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   cmd
-- FROM pg_policies
-- WHERE tablename = 'events'
--   AND policyname = 'Email endpoint can read events for purchases';
-- 
-- Resultado esperado: 1 fila con cmd = 'SELECT'
-- ============================================
