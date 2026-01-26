-- ============================================
-- FIX: Error RLS al crear compras - Política con recursión
-- ============================================
-- El problema: La política "Producers can view purchases for own events"
-- consulta purchases dentro de purchases, causando recursión infinita
-- cuando se intenta crear una compra.
-- 
-- Solución: Usar event_id directamente en lugar de hacer JOIN con tickets

-- Eliminar política problemática
DROP POLICY IF EXISTS "Producers can view purchases for own events" ON purchases;

-- Crear nueva política sin recursión usando event_id directamente
CREATE POLICY "Producers can view purchases for own events"
  ON purchases FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN producers p ON e.producer_id = p.id
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

-- Verificar que la política INSERT existe (debería estar, pero por si acaso)
DROP POLICY IF EXISTS "Anyone can create purchases" ON purchases;
CREATE POLICY "Anyone can create purchases"
  ON purchases FOR INSERT
  WITH CHECK (true);
