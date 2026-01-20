-- ============================================
-- FIX: Eventos públicos no se muestran después de migración
-- ============================================
-- Este script verifica y corrige las políticas RLS necesarias
-- para que los eventos públicos se muestren en la página principal

-- 1. Verificar que RLS está habilitado
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;

-- 2. Asegurar política para eventos públicos
DROP POLICY IF EXISTS "Public can view published events" ON events;
CREATE POLICY "Public can view published events"
  ON events FOR SELECT
  USING (status = 'published' AND published_at IS NOT NULL);

-- 3. Asegurar política para ticket_types públicos
-- Esta política es crítica porque el query hace un join con ticket_types
DROP POLICY IF EXISTS "Public can view ticket types for published events" ON ticket_types;
CREATE POLICY "Public can view ticket types for published events"
  ON ticket_types FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE status = 'published' AND published_at IS NOT NULL
    )
  );

-- 4. Verificación: Contar eventos publicados
-- Ejecuta esto para verificar que hay eventos disponibles
SELECT 
  'Eventos publicados' as tipo,
  COUNT(*) as cantidad
FROM events
WHERE status = 'published' AND published_at IS NOT NULL
UNION ALL
SELECT 
  'Eventos con ticket_types' as tipo,
  COUNT(DISTINCT e.id) as cantidad
FROM events e
INNER JOIN ticket_types tt ON tt.event_id = e.id
WHERE e.status = 'published' AND e.published_at IS NOT NULL;
