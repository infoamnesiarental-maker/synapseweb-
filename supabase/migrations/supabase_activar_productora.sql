-- ============================================
-- 🔧 ACTIVAR PRODUCTORA (Solución sin tocar código)
-- ============================================
-- Este script activa tu productora para que puedas acceder al dashboard
-- 
-- OPCIONES:
-- 1. Activar por user_id (recomendado si conoces tu user_id)
-- 2. Activar por email (si no conoces tu user_id)
-- 3. Activar todas las productoras (solo para desarrollo/testing)

-- ============================================
-- OPCIÓN 1: Activar por USER_ID (RECOMENDADO)
-- ============================================
-- Reemplaza 'TU_USER_ID_AQUI' con tu user_id de Supabase
-- Puedes encontrarlo en: Authentication > Users > tu usuario > UUID

-- UPDATE producers
-- SET is_active = true
-- WHERE user_id = 'TU_USER_ID_AQUI';

-- ============================================
-- OPCIÓN 2: Activar por EMAIL
-- ============================================
-- Reemplaza 'tu-email@ejemplo.com' con tu email

-- UPDATE producers
-- SET is_active = true
-- WHERE user_id IN (
--   SELECT id FROM profiles WHERE email = 'tu-email@ejemplo.com'
-- );

-- ============================================
-- OPCIÓN 3: Ver todas las productoras primero
-- ============================================
-- Ejecuta esto primero para ver qué productoras tienes y sus estados

SELECT 
  p.id,
  p.name as nombre_productora,
  pr.email as email_usuario,
  pr.full_name as nombre_completo,
  p.is_active as esta_activa,
  p.registration_stage as etapa_registro,
  p.created_at as fecha_creacion
FROM producers p
JOIN profiles pr ON p.user_id = pr.id
ORDER BY p.created_at DESC;

-- ============================================
-- OPCIÓN 4: Activar todas las productoras (SOLO DESARROLLO)
-- ============================================
-- ⚠️ CUIDADO: Esto activa TODAS las productoras
-- Solo úsalo si estás en desarrollo/testing

-- UPDATE producers
-- SET is_active = true
-- WHERE is_active = false;

-- ============================================
-- VERIFICACIÓN: Ver el estado después de activar
-- ============================================
-- Ejecuta esto después de activar para verificar

-- SELECT 
--   p.name as nombre_productora,
--   pr.email as email_usuario,
--   p.is_active as esta_activa,
--   CASE 
--     WHEN p.is_active THEN '✅ ACTIVA'
--     ELSE '❌ INACTIVA'
--   END as estado
-- FROM producers p
-- JOIN profiles pr ON p.user_id = pr.id
-- WHERE pr.email = 'tu-email@ejemplo.com';
