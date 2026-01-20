-- ============================================
-- FIX: Recursión infinita en políticas RLS de purchases
-- ============================================
-- El problema: La política "Producers can view purchases for own events"
-- consulta purchases dentro de purchases, causando recursión infinita.
-- 
-- Solución: Usar event_id directamente (que ahora existe en purchases)
-- en lugar de hacer JOIN con tickets

-- ============================================
-- 1. ELIMINAR POLÍTICA PROBLEMÁTICA
-- ============================================

DROP POLICY IF EXISTS "Producers can view purchases for own events" ON purchases;

-- ============================================
-- 2. CREAR NUEVA POLÍTICA SIN RECURSIÓN
-- ============================================

-- Nueva política que usa event_id directamente
-- Evita consultar purchases dentro de purchases
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

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
