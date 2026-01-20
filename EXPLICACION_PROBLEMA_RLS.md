# 🔍 Explicación: Por qué no se muestran los eventos

## ¿Qué hace el código actual?

El hook `usePublicEvents` hace este query:

```typescript
supabase
  .from('events')
  .select(`
    *,
    ticket_types (
      id, price, quantity_available, quantity_sold, 
      sale_start_date, sale_end_date
    )
  `)
  .eq('status', 'published')
  .not('published_at', 'is', null)
```

**Esto significa:**
1. Busca eventos con `status = 'published'` y `published_at IS NOT NULL`
2. Hace un **JOIN** con la tabla `ticket_types` para obtener los tipos de tickets
3. **Ambas tablas** necesitan políticas RLS que permitan acceso público

## ¿Por qué podría no funcionar ahora?

### Posibles causas (sin tocar RLS todavía):

#### 1. **RLS está deshabilitado** 
Si RLS está deshabilitado, Supabase bloquea TODO por defecto. Esto es lo más probable.

#### 2. **Falta la política para `ticket_types`**
El query hace un JOIN con `ticket_types`. Si esa tabla no tiene política pública, el JOIN falla silenciosamente.

#### 3. **Los eventos no tienen el estado correcto**
Los eventos podrían tener `status = 'draft'` o `published_at = NULL`.

#### 4. **Variables de entorno cambiaron**
Después de la migración, las credenciales de Supabase podrían haber cambiado.

## ¿Qué cambió en la migración?

Revisando las migraciones, veo que hay varios archivos que modifican RLS:

- `supabase_fix_rls_recursion.sql` - Arregla recursión en profiles
- `supabase_fix_purchases_rls_recursion.sql` - Arregla recursión en purchases
- `supabase_fix_producers_insert_policy.sql` - Arregla INSERT en producers
- `supabase_add_delete_events_policy.sql` - Agrega DELETE para eventos

**⚠️ IMPORTANTE:** Ninguna de estas migraciones debería haber afectado la política "Public can view published events", PERO:

1. Si ejecutaste las migraciones en orden incorrecto
2. Si alguna migración falló a mitad de camino
3. Si RLS se deshabilitó accidentalmente
4. Si las políticas se borraron y no se recrearon

**Entonces las políticas podrían no existir.**

## ¿Qué haría el script de "fix"?

El script `supabase_fix_public_events_rls.sql` haría esto:

### 1. **Habilitar RLS** (si está deshabilitado)
```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
```
**Esto es seguro** - Solo habilita RLS, no cambia las políticas existentes.

### 2. **Recrear la política de eventos** (con DROP IF EXISTS)
```sql
DROP POLICY IF EXISTS "Public can view published events" ON events;
CREATE POLICY "Public can view published events"
  ON events FOR SELECT
  USING (status = 'published' AND published_at IS NOT NULL);
```
**Esto es seguro** - Solo recrea la política exactamente como está en `supabase_mvp_schema.sql` (líneas 459-462).

### 3. **Recrear la política de ticket_types** (con DROP IF EXISTS)
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
**Esto es seguro** - Solo recrea la política exactamente como está en `supabase_mvp_schema.sql` (líneas 522-530).

## ¿Qué NO cambia el script?

- ✅ No modifica datos
- ✅ No cambia la estructura de tablas
- ✅ No modifica otras políticas RLS
- ✅ No cambia permisos de productores o admins
- ✅ Solo asegura que las políticas públicas existan

## Plan de acción recomendado

### PASO 1: Diagnóstico (SIN MODIFICAR NADA)
Ejecuta `supabase_diagnostico_rls.sql` en Supabase SQL Editor.
Esto te dirá:
- ¿RLS está habilitado?
- ¿Existen las políticas?
- ¿Hay eventos publicados?

### PASO 2: Revisar consola del navegador
Abre "/" en el navegador, abre DevTools (F12), y revisa:
- ¿Hay errores en Console?
- ¿Qué error específico muestra?

### PASO 3: Decidir si ejecutar el fix
Solo si el diagnóstico muestra que:
- ❌ RLS está deshabilitado, O
- ❌ Faltan las políticas públicas

Entonces ejecuta `supabase_fix_public_events_rls.sql`

## ¿Por qué es seguro?

El script usa `DROP POLICY IF EXISTS` y `CREATE POLICY`, que es **idempotente**:
- Si la política existe, la borra y la recrea igual
- Si no existe, la crea
- No afecta otras políticas
- Es exactamente lo que está en el schema original
