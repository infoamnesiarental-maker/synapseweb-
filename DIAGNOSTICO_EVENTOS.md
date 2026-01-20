# 🔍 Diagnóstico: Eventos no se muestran en "/"

## Problema
Después de una migración, los eventos de Supabase no se están mostrando en la página principal "/".

## Posibles Causas

### 1. **Políticas RLS (Row Level Security)**
Las políticas RLS podrían no estar aplicadas correctamente después de la migración.

**Verificar:**
```sql
-- Verificar que la política existe
SELECT * FROM pg_policies WHERE tablename = 'events' AND policyname = 'Public can view published events';

-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'events';
```

**Solución si falta:**
```sql
-- Habilitar RLS si no está habilitado
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Crear política si no existe
DROP POLICY IF EXISTS "Public can view published events" ON events;
CREATE POLICY "Public can view published events"
  ON events FOR SELECT
  USING (status = 'published' AND published_at IS NOT NULL);
```

### 2. **Estado de los Eventos**
Los eventos podrían no tener el estado correcto.

**Verificar:**
```sql
-- Ver cuántos eventos hay y su estado
SELECT 
  status,
  COUNT(*) as cantidad,
  COUNT(CASE WHEN published_at IS NOT NULL THEN 1 END) as con_published_at
FROM events
GROUP BY status;
```

**Solución:**
- Asegúrate de que los eventos tengan `status = 'published'`
- Asegúrate de que tengan `published_at` establecido

### 3. **Políticas RLS de ticket_types**
El query hace un join con `ticket_types`, que también necesita políticas RLS.

**Verificar:**
```sql
-- Verificar política de ticket_types
SELECT * FROM pg_policies 
WHERE tablename = 'ticket_types' 
AND policyname = 'Public can view ticket types for published events';
```

**Solución si falta:**
```sql
DROP POLICY IF EXISTS "Public can view ticket types for published events" ON ticket_types;
CREATE POLICY "Public can view ticket types for published events"
  ON ticket_types FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE status = 'published' AND published_at IS NOT NULL
    )
  );
```

### 4. **Variables de Entorno**
Después de la migración, las variables de entorno podrían haber cambiado.

**Verificar:**
- `NEXT_PUBLIC_SUPABASE_URL` está configurada correctamente
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` está configurada correctamente

### 5. **Problema con el Cliente de Supabase**
El cliente podría no estar inicializándose correctamente.

**Verificar en la consola del navegador:**
- Abre las DevTools (F12)
- Ve a la pestaña Console
- Busca errores relacionados con Supabase
- Busca el mensaje: "Error obteniendo eventos públicos:"

## Pasos de Diagnóstico

1. **Abre la consola del navegador** y revisa si hay errores
2. **Verifica en Supabase Dashboard:**
   - Ve a Authentication > Policies
   - Verifica que existan las políticas para `events` y `ticket_types`
3. **Ejecuta este query en Supabase SQL Editor:**
```sql
-- Ver eventos publicados
SELECT 
  id,
  name,
  status,
  published_at,
  start_date,
  (SELECT COUNT(*) FROM ticket_types WHERE event_id = events.id) as ticket_types_count
FROM events
WHERE status = 'published' AND published_at IS NOT NULL
ORDER BY start_date;
```

4. **Prueba el query directamente desde el código:**
   - Abre `/` en el navegador
   - Revisa la consola para ver el error específico
   - El componente `EventsSection` ahora muestra errores si los hay

## Solución Rápida

Si los eventos existen pero no se muestran, ejecuta esto en Supabase SQL Editor:

```sql
-- 1. Verificar y habilitar RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;

-- 2. Asegurar políticas de eventos
DROP POLICY IF EXISTS "Public can view published events" ON events;
CREATE POLICY "Public can view published events"
  ON events FOR SELECT
  USING (status = 'published' AND published_at IS NOT NULL);

-- 3. Asegurar políticas de ticket_types
DROP POLICY IF EXISTS "Public can view ticket types for published events" ON ticket_types;
CREATE POLICY "Public can view ticket types for published events"
  ON ticket_types FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE status = 'published' AND published_at IS NOT NULL
    )
  );
```
