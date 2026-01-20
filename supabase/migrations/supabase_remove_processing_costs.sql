-- ============================================
-- MIGRACIÓN: Eliminar costos de procesamiento
-- ============================================
-- Elimina el campo processing_costs de purchases
-- ya que no se utilizará en el modelo de negocio

-- ============================================
-- 1. Eliminar columna processing_costs
-- ============================================

ALTER TABLE purchases 
DROP COLUMN IF EXISTS processing_costs;

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
