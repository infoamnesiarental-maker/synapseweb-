-- ============================================
-- 🔍 DIAGNÓSTICO: Verificar estado actual de RLS
-- ============================================
-- Este script SOLO LEE información, NO MODIFICA NADA
-- Ejecuta esto primero para entender qué está pasando

-- 1. Verificar si RLS está habilitado en las tablas
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_habilitado,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ACTIVO' 
    ELSE '❌ RLS DESACTIVADO' 
  END as estado
FROM pg_tables 
WHERE tablename IN ('events', 'ticket_types')
ORDER BY tablename;

-- 2. Verificar qué políticas RLS existen para 'events'
SELECT 
  schemaname,
  tablename,
  policyname as nombre_politica,
  permissive,
  roles,
  cmd as comando, -- SELECT, INSERT, UPDATE, DELETE, ALL
  qual as condicion_using,
  with_check as condicion_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- 3. Verificar qué políticas RLS existen para 'ticket_types'
SELECT 
  schemaname,
  tablename,
  policyname as nombre_politica,
  permissive,
  roles,
  cmd as comando,
  qual as condicion_using,
  with_check as condicion_check
FROM pg_policies 
WHERE tablename = 'ticket_types'
ORDER BY policyname;

-- 4. Verificar si existe la política específica para eventos públicos
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ POLÍTICA EXISTE'
    ELSE '❌ POLÍTICA NO EXISTE'
  END as estado_politica_publica_events,
  COUNT(*) as cantidad
FROM pg_policies 
WHERE tablename = 'events' 
  AND policyname = 'Public can view published events';

-- 5. Verificar si existe la política específica para ticket_types públicos
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ POLÍTICA EXISTE'
    ELSE '❌ POLÍTICA NO EXISTE'
  END as estado_politica_publica_ticket_types,
  COUNT(*) as cantidad
FROM pg_policies 
WHERE tablename = 'ticket_types' 
  AND policyname = 'Public can view ticket types for published events';

-- 6. Contar eventos por estado (para verificar datos)
SELECT 
  status,
  COUNT(*) as total_eventos,
  COUNT(CASE WHEN published_at IS NOT NULL THEN 1 END) as con_published_at,
  COUNT(CASE WHEN published_at IS NULL THEN 1 END) as sin_published_at
FROM events
GROUP BY status
ORDER BY status;

-- 7. Ver eventos que DEBERÍAN ser visibles públicamente
SELECT 
  id,
  name,
  status,
  published_at,
  start_date,
  (SELECT COUNT(*) FROM ticket_types WHERE event_id = events.id) as cantidad_ticket_types
FROM events
WHERE status = 'published' AND published_at IS NOT NULL
ORDER BY start_date
LIMIT 10;

-- 8. Resumen: ¿Qué podría estar fallando?
SELECT 
  'RLS en events' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'events' AND rowsecurity = true)
    THEN '✅ Habilitado'
    ELSE '❌ Deshabilitado - ESTO PODRÍA SER EL PROBLEMA'
  END as resultado
UNION ALL
SELECT 
  'RLS en ticket_types' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ticket_types' AND rowsecurity = true)
    THEN '✅ Habilitado'
    ELSE '❌ Deshabilitado - ESTO PODRÍA SER EL PROBLEMA'
  END as resultado
UNION ALL
SELECT 
  'Política pública events' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Public can view published events')
    THEN '✅ Existe'
    ELSE '❌ No existe - ESTO PODRÍA SER EL PROBLEMA'
  END as resultado
UNION ALL
SELECT 
  'Política pública ticket_types' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ticket_types' AND policyname = 'Public can view ticket types for published events')
    THEN '✅ Existe'
    ELSE '❌ No existe - ESTO PODRÍA SER EL PROBLEMA'
  END as resultado
UNION ALL
SELECT 
  'Eventos publicados disponibles' as verificacion,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Hay ' || COUNT(*)::text || ' eventos'
    ELSE '❌ No hay eventos publicados - ESTO PODRÍA SER EL PROBLEMA'
  END as resultado
FROM events
WHERE status = 'published' AND published_at IS NOT NULL;
