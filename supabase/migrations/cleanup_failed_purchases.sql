-- Función para limpiar compras fallidas antiguas (más de 30 días)
-- Esta función se puede ejecutar manualmente o programar con pg_cron

CREATE OR REPLACE FUNCTION cleanup_old_failed_purchases()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar compras fallidas con más de 30 días
  WITH deleted AS (
    DELETE FROM purchases
    WHERE payment_status = 'failed'
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN QUERY SELECT deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentario: Para ejecutar manualmente:
-- SELECT cleanup_old_failed_purchases();

-- Para programar con pg_cron (requiere extensión pg_cron):
-- SELECT cron.schedule('cleanup-failed-purchases', '0 2 * * *', 'SELECT cleanup_old_failed_purchases();');
-- Esto ejecutaría la limpieza todos los días a las 2 AM
