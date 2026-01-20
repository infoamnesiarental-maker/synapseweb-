# 🔍 Análisis Completo: Error de Recursión en Purchases

## 📋 El Problema

**Error:** `infinite recursion detected in policy for relation "purchases"`

**Cuándo ocurre:** Al intentar crear una compra (INSERT en tabla `purchases`)

---

## 🎯 Causa Raíz

### ¿Por qué ocurre la recursión?

Cuando haces un **INSERT** en Supabase con RLS habilitado, PostgreSQL hace lo siguiente:

1. **Verifica la política INSERT** (`WITH CHECK`) → ✅ Permite insertar
2. **Verifica las políticas SELECT** → Para asegurarse de que puedes VER lo que insertaste
3. **Aquí está el problema**: Si una política SELECT consulta la misma tabla que estás insertando, causa recursión infinita

### La Política Problemática

```sql
CREATE POLICY "Producers can view purchases for own events"
  ON purchases FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT p.id FROM purchases p  -- ⚠️ AQUÍ ESTÁ EL PROBLEMA
      JOIN tickets t ON t.purchase_id = p.id
      JOIN events e ON t.event_id = e.id
      JOIN producers pr ON e.producer_id = pr.id
      JOIN profiles prof ON pr.user_id = prof.id
      WHERE prof.id = auth.uid()
    )
  );
```

**¿Qué pasa?**
1. Intentas INSERTAR una compra
2. Supabase verifica si puedes VER esa compra (política SELECT)
3. La política SELECT consulta `purchases` dentro de sí misma
4. Esa consulta también pasa por RLS y consulta `purchases` otra vez
5. **Recursión infinita** 🔄

---

## 🤔 ¿Afecta el Rol del Usuario?

### Respuesta: **SÍ, pero indirectamente**

**Si estás logueado como PRODUCTORA:**
- Supabase evalúa TODAS las políticas, incluyendo "Producers can view purchases for own events"
- Esta política tiene recursión → **FALLA**

**Si estás logueado como CLIENTE normal:**
- Supabase también evalúa TODAS las políticas
- Aunque no seas productora, la política SELECT se evalúa igual
- Si tiene recursión → **FALLA igual**

**Conclusión:** El problema NO es el rol, sino que la política SELECT tiene recursión y se evalúa SIEMPRE durante INSERT, sin importar el rol.

---

## ✅ Solución Implementada

### Cambio en la Política

**ANTES (con recursión):**
```sql
CREATE POLICY "Producers can view purchases for own events"
  ON purchases FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT p.id FROM purchases p  -- ❌ Consulta purchases dentro de purchases
      JOIN tickets t ON t.purchase_id = p.id
      ...
    )
  );
```

**DESPUÉS (sin recursión):**
```sql
CREATE POLICY "Producers can view purchases for own events"
  ON purchases FOR SELECT
  USING (
    event_id IN (  -- ✅ Usa event_id directamente (ya existe en purchases)
      SELECT e.id FROM events e
      JOIN producers p ON e.producer_id = p.id
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );
```

**¿Por qué funciona?**
- Ya no consulta `purchases` dentro de la política
- Usa `event_id` que está directamente en la tabla `purchases`
- Consulta `events` y `producers`, que no causan recursión

---

## 🔍 Verificación de Otras Políticas

### Políticas que consultan `purchases`:

1. **"Users can view own tickets"** (tabla `tickets`)
   ```sql
   SELECT id FROM purchases WHERE user_id = auth.uid()
   ```
   - ✅ **NO causa recursión** porque está en la tabla `tickets`, no en `purchases`

2. **"Producers can view refunds"** (tabla `refunds`)
   ```sql
   SELECT DISTINCT p.id FROM purchases p ...
   ```
   - ✅ **NO causa recursión** porque está en la tabla `refunds`, no en `purchases`

3. **"Producers can view purchases"** (tabla `purchases`)
   ```sql
   SELECT DISTINCT p.id FROM purchases p ...  -- ❌ RECURSIÓN
   ```
   - ❌ **SÍ causa recursión** porque está en la misma tabla

---

## 📝 Pasos para Aplicar el Fix

### 1. Ejecutar la Migración

En Supabase SQL Editor, ejecuta:

```sql
-- Eliminar política problemática
DROP POLICY IF EXISTS "Producers can view purchases for own events" ON purchases;

-- Crear nueva política sin recursión
CREATE POLICY "Producers can view purchases for own events"
  ON purchases FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN producers p ON e.producer_id = p.id
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );
```

### 2. Verificar que `event_id` existe en purchases

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'purchases' 
AND column_name = 'event_id';
```

**Resultado esperado:** Debe retornar una fila con `event_id`

### 3. Probar el Checkout

1. Inicia sesión como **cliente normal** (no productora)
2. Intenta crear una compra
3. Debería funcionar sin errores

---

## 🎯 Resumen

| Aspecto | Detalle |
|---------|---------|
| **Causa** | Política SELECT consulta `purchases` dentro de `purchases` |
| **Cuándo ocurre** | Durante INSERT en `purchases` |
| **¿Afecta el rol?** | Indirectamente: se evalúa siempre, pero productoras la activan más |
| **Solución** | Usar `event_id` directamente en lugar de JOIN con `purchases` |
| **Estado** | ✅ Fix creado en `supabase_fix_purchases_rls_recursion.sql` |

---

## ⚠️ Notas Importantes

1. **El `event_id` debe existir** en purchases antes de ejecutar el fix
2. **La migración `supabase_add_payment_fields.sql`** ya agrega `event_id`
3. **Orden de ejecución:**
   - Primero: `supabase_add_payment_fields.sql` (agrega `event_id`)
   - Segundo: `supabase_fix_purchases_rls_recursion.sql` (arregla recursión)

---

## 🧪 Cómo Verificar que Funciona

```sql
-- 1. Verificar que la política nueva existe
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'purchases'
AND policyname = 'Producers can view purchases for own events';

-- 2. Verificar que NO consulta purchases dentro de purchases
-- (debe usar event_id directamente)
```

---

**¿Todavía tienes el error?** Verifica que:
1. ✅ La migración se ejecutó correctamente
2. ✅ El campo `event_id` existe en `purchases`
3. ✅ Estás insertando `event_id` en el código (línea 61 de `useCheckout.ts`)
