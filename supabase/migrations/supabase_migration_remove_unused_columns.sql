-- ============================================
-- MIGRACIÓN: Eliminar columnas no utilizadas
-- ============================================
-- Este script elimina las columnas que no se usan en el registro de productoras
-- 
-- ⚠️ IMPORTANTE: Ejecutar en Supabase SQL Editor
-- 
-- Columnas a eliminar:
-- - logo_url (no se pide en el registro)
-- - website (no se pide en el registro)
-- - facebook (no se pide en el registro)
-- - twitter (no se pide en el registro)

-- ============================================
-- 1. ELIMINAR COLUMNAS NO UTILIZADAS
-- ============================================

-- Eliminar logo_url
ALTER TABLE producers 
DROP COLUMN IF EXISTS logo_url;

-- Eliminar website
ALTER TABLE producers 
DROP COLUMN IF EXISTS website;

-- Eliminar facebook
ALTER TABLE producers 
DROP COLUMN IF EXISTS facebook;

-- Eliminar twitter
ALTER TABLE producers 
DROP COLUMN IF EXISTS twitter;

-- ============================================
-- ✅ FIN DE LA MIGRACIÓN
-- ============================================
-- 
-- Verificación:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'producers' 
-- ORDER BY ordinal_position;
--
-- Las columnas eliminadas NO deberían aparecer en el resultado
