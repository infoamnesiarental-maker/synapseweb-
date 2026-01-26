-- ============================================
-- FIX COMPLETO: Error RLS al crear compras
-- ============================================
-- Este script corrige el error: "new row violates row-level security policy for table purchases"
-- 
-- Problema: La política SELECT "Producers can view purchases for own events" 
-- consulta purchases dentro de purchases, causando recursión infinita durante INSERT.
-- 
-- Solución: Usar event_id directamente en lugar de hacer JOIN con tickets/purchases

-- ============================================
-- PASO 1: Eliminar política problemática
-- ============================================

DROP POLICY IF EXISTS "Producers can view purchases for own events" ON purchases;

-- ============================================
-- PASO 2: Crear nueva política sin recursión
-- ============================================

CREATE POLICY "Producers can view purchases for own events"
  ON purchases FOR SELECT
  USING (
    event_id IN (
      SELECT e.id 
      FROM events e
      JOIN producers p ON e.producer_id = p.id
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

-- ============================================
-- PASO 3: Asegurar que la política INSERT existe
-- ============================================

DROP POLICY IF EXISTS "Anyone can create purchases" ON purchases;
CREATE POLICY "Anyone can create purchases"
  ON purchases FOR INSERT
  WITH CHECK (true);

-- ============================================
-- PASO 4: Verificar otras políticas necesarias
-- ============================================

-- Usuarios pueden ver sus propias compras
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  USING (user_id = auth.uid());

-- Guests pueden ver compras por email (validación en app)
DROP POLICY IF EXISTS "Guests can view purchases by email" ON purchases;
CREATE POLICY "Guests can view purchases by email"
  ON purchases FOR SELECT
  USING (
    user_id IS NULL AND
    guest_email IS NOT NULL
  );

-- Admin puede ver todas las compras
DROP POLICY IF EXISTS "Admins can view all purchases" ON purchases;
CREATE POLICY "Admins can view all purchases"
  ON purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usuarios pueden actualizar sus propias compras
DROP POLICY IF EXISTS "Users can update own purchases" ON purchases;
CREATE POLICY "Users can update own purchases"
  ON purchases FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
-- Después de ejecutar este script, intenta crear una compra nuevamente.
-- El error debería desaparecer.
