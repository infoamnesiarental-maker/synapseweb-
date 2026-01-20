-- ============================================
-- MIGRACIÓN: Agregar campos para registro por etapas
-- ============================================
-- Este script agrega las nuevas columnas necesarias para el registro
-- de productoras por etapas sin modificar las políticas RLS existentes
-- 
-- ⚠️ IMPORTANTE: Ejecutar en Supabase SQL Editor
-- Las políticas RLS existentes seguirán funcionando automáticamente
--
-- FLUJO: El usuario DEBE estar registrado primero, luego puede crear productora
-- Etapa 1: Perfil (datos de marca)
-- Etapa 2: Cuenta (Razón Social, CUIT, datos administrativos)
-- Etapa 3: Banco (opcional)

-- ============================================
-- 1. AGREGAR NUEVAS COLUMNAS A producers
-- ============================================

-- Razón Social / Nombre legal
ALTER TABLE producers 
ADD COLUMN IF NOT EXISTS business_name TEXT;

-- CUIT (único, no modificable después de crear)
ALTER TABLE producers 
ADD COLUMN IF NOT EXISTS cuit TEXT;

-- Email administrativo interno
ALTER TABLE producers 
ADD COLUMN IF NOT EXISTS admin_email TEXT;

-- Teléfono administrativo
ALTER TABLE producers 
ADD COLUMN IF NOT EXISTS admin_phone TEXT;

-- WhatsApp
ALTER TABLE producers 
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Datos bancarios
ALTER TABLE producers 
ADD COLUMN IF NOT EXISTS bank_name TEXT;

ALTER TABLE producers 
ADD COLUMN IF NOT EXISTS bank_account_type TEXT CHECK (bank_account_type IN ('corriente', 'ahorro') OR bank_account_type IS NULL);

ALTER TABLE producers 
ADD COLUMN IF NOT EXISTS cbu TEXT;

-- Etapa de registro actual
ALTER TABLE producers 
ADD COLUMN IF NOT EXISTS registration_stage TEXT DEFAULT 'profile' CHECK (registration_stage IN ('profile', 'account', 'bank', 'complete'));

-- ============================================
-- 2. CONSTRAINTS Y VALIDACIONES
-- ============================================

-- CUIT debe ser único (si tiene valor)
CREATE UNIQUE INDEX IF NOT EXISTS idx_producers_cuit_unique 
ON producers(cuit) 
WHERE cuit IS NOT NULL;

-- ============================================
-- 3. FUNCIÓN PARA PROTEGER CUIT
-- ============================================

-- Función que previene modificar CUIT si ya tiene valor
CREATE OR REPLACE FUNCTION prevent_cuit_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el CUIT ya tenía un valor y se intenta cambiar
  IF OLD.cuit IS NOT NULL AND NEW.cuit IS NOT NULL AND OLD.cuit != NEW.cuit THEN
    RAISE EXCEPTION 'El CUIT no puede ser modificado después de ser establecido. Contacta a soporte si necesitas cambiarlo.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para proteger CUIT
DROP TRIGGER IF EXISTS protect_cuit_trigger ON producers;
CREATE TRIGGER protect_cuit_trigger
  BEFORE UPDATE ON producers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cuit_modification();

-- ============================================
-- 4. ACTUALIZAR COLUMNAS EXISTENTES (si es necesario)
-- ============================================

-- Asegurar que name tenga un valor por defecto si es necesario
-- (No modificamos, solo documentamos que name = "Nombre de fantasía")

-- ============================================
-- 5. COMENTARIOS SOBRE USO DE COLUMNAS
-- ============================================

COMMENT ON COLUMN producers.name IS 'Nombre de fantasía (nombre público de la marca)';
COMMENT ON COLUMN producers.business_name IS 'Razón Social / Nombre legal de la empresa';
COMMENT ON COLUMN producers.cuit IS 'CUIT - No modificable después de ser establecido';
COMMENT ON COLUMN producers.admin_email IS 'Email administrativo interno para notificaciones del sistema';
COMMENT ON COLUMN producers.email_contact IS 'Email de contacto público visible en el perfil';
COMMENT ON COLUMN producers.registration_stage IS 'Etapa actual del registro: profile, account, bank, complete';

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
-- Deberías ver las nuevas columnas:
-- business_name, cuit, admin_email, admin_phone, whatsapp,
-- bank_name, bank_account_type, cbu, registration_stage
