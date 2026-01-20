-- ============================================
-- Política RLS para permitir que productoras eliminen sus propios eventos
-- ============================================

-- Productoras pueden eliminar sus propios eventos
DROP POLICY IF EXISTS "Producers can delete own events" ON events;
CREATE POLICY "Producers can delete own events"
  ON events FOR DELETE
  USING (
    producer_id IN (
      SELECT p.id FROM producers p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

-- Admins pueden eliminar cualquier evento
DROP POLICY IF EXISTS "Admins can delete all events" ON events;
CREATE POLICY "Admins can delete all events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
