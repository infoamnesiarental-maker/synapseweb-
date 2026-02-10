# Guía: Probar Idempotencia y Auditoría

## 📋 Pasos para Probar

---

## 1️⃣ Ejecutar la Migración SQL

### Opción A: Desde Supabase Dashboard (Recomendado)

1. Ir a: https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a: **SQL Editor** (menú lateral)
4. Hacer clic en **New Query**
5. Copiar y pegar el contenido de:
   ```
   synapseweb/supabase/migrations/add_webhook_logs_and_audit_logs.sql
   ```
6. Hacer clic en **Run** (o presionar `Ctrl+Enter`)
7. Verificar que aparezca: **Success. No rows returned**

### Opción B: Desde CLI (si usás Supabase CLI)

```bash
cd synapseweb
supabase db push
```

---

## 2️⃣ Verificar que las Tablas se Crearon

### En Supabase Dashboard:

1. Ir a: **Table Editor** (menú lateral)
2. Buscar las tablas:
   - ✅ `webhook_logs` (debe existir)
   - ✅ `audit_logs` (debe existir)

### O con SQL:

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('webhook_logs', 'audit_logs');
```

**Resultado esperado:**
```
webhook_logs
audit_logs
```

---

## 3️⃣ Hacer un Pago de Prueba Real

### Paso 1: Crear una Compra

1. Ir a tu app en producción (Vercel)
2. Seleccionar un evento
3. Agregar tickets al carrito
4. Ir a checkout
5. Completar datos del comprador
6. Hacer clic en "Pagar con Mercado Pago"

### Paso 2: Completar el Pago

1. Serás redirigido a Mercado Pago
2. Usar una tarjeta de prueba (o real si querés)
3. Completar el pago
4. Serás redirigido de vuelta a tu app

### Paso 3: Verificar que Funcionó

1. Deberías ver la página de éxito con tus tickets
2. Deberías recibir un email con los tickets
3. En "Mis Compras" deberías ver la compra como "Completado"

---

## 4️⃣ Verificar los Logs en Supabase

### Opción A: Desde Table Editor

1. Ir a: **Table Editor** → `webhook_logs`
2. Deberías ver una fila con:
   - `payment_id`: ID del pago de Mercado Pago
   - `purchase_id`: ID de tu compra
   - `payment_status`: `completed` (o el estado que corresponda)
   - `processed_at`: Fecha/hora cuando se procesó

3. Ir a: **Table Editor** → `audit_logs`
4. Deberías ver una fila con:
   - `entity_type`: `purchase`
   - `entity_id`: ID de tu compra
   - `action`: `status_changed`
   - `old_value`: `{"payment_status": "pending"}`
   - `new_value`: `{"payment_status": "completed"}`
   - `triggered_by`: `mercadopago_webhook`

### Opción B: Con SQL (Más Detallado)

#### Ver Webhook Logs:

```sql
-- Ver todos los webhooks procesados
SELECT 
  id,
  payment_id,
  purchase_id,
  payment_status,
  processed_at,
  created_at
FROM webhook_logs
ORDER BY processed_at DESC
LIMIT 10;
```

#### Ver Audit Logs:

```sql
-- Ver todos los cambios de estado
SELECT 
  id,
  entity_type,
  entity_id,
  action,
  old_value,
  new_value,
  changed_field,
  triggered_by,
  created_at
FROM audit_logs
WHERE entity_type = 'purchase'
ORDER BY created_at DESC
LIMIT 10;
```

#### Ver Logs de una Compra Específica:

```sql
-- Reemplazar 'TU_PURCHASE_ID' con el ID real de tu compra
SELECT 
  wl.payment_id,
  wl.payment_status as webhook_status,
  wl.processed_at,
  al.action,
  al.old_value,
  al.new_value,
  al.triggered_by
FROM webhook_logs wl
LEFT JOIN audit_logs al ON al.entity_id = wl.purchase_id
WHERE wl.purchase_id = 'TU_PURCHASE_ID'
ORDER BY wl.processed_at DESC;
```

---

## 5️⃣ Probar Idempotencia (Webhook Duplicado)

### Simular Webhook Duplicado:

**⚠️ IMPORTANTE:** Esto es solo para testing. No hacer en producción sin cuidado.

#### Opción A: Desde Mercado Pago Dashboard

1. Ir a: https://www.mercadopago.com.ar/developers/panel
2. Ir a: **Webhooks** → **Notificaciones**
3. Buscar el pago que hiciste
4. Hacer clic en **Reenviar notificación** (si está disponible)

#### Opción B: Simular Manualmente (Solo para Testing)

```sql
-- 1. Obtener el payment_id de una compra existente
SELECT payment_id, purchase_id 
FROM purchases 
WHERE payment_status = 'completed' 
LIMIT 1;

-- 2. Simular que el webhook se procesa de nuevo
-- (Esto NO debería crear duplicados gracias a la idempotencia)
```

**Verificar que NO se duplicó:**

```sql
-- Verificar que solo hay 1 registro por payment_id
SELECT 
  payment_id,
  COUNT(*) as veces_procesado
FROM webhook_logs
GROUP BY payment_id
HAVING COUNT(*) > 1;
```

**Resultado esperado:** No debería haber filas (cada `payment_id` solo se procesa una vez)

---

## 6️⃣ Verificar que NO se Enviaron Emails Duplicados

### Verificar en Resend (si usás Resend):

1. Ir a: https://resend.com/emails
2. Buscar emails enviados para tu compra
3. Deberías ver **solo 1 email** por compra

### Verificar en Logs:

```sql
-- Ver cuántas veces se procesó cada webhook
SELECT 
  payment_id,
  purchase_id,
  payment_status,
  processed_at,
  COUNT(*) OVER (PARTITION BY payment_id) as veces_procesado
FROM webhook_logs
ORDER BY processed_at DESC;
```

**Resultado esperado:** `veces_procesado` siempre debe ser `1`

---

## 7️⃣ Checklist de Verificación

### ✅ Verificaciones Básicas:

- [ ] Las tablas `webhook_logs` y `audit_logs` existen
- [ ] Se puede hacer un pago de prueba
- [ ] El webhook se procesa correctamente
- [ ] Aparece un registro en `webhook_logs`
- [ ] Aparece un registro en `audit_logs` (si cambió el estado)
- [ ] Solo se envió 1 email por compra

### ✅ Verificaciones de Idempotencia:

- [ ] Si el webhook se procesa 2 veces, solo se crea 1 registro en `webhook_logs`
- [ ] Si el webhook se procesa 2 veces, solo se envía 1 email
- [ ] Si el webhook se procesa 2 veces, no se crean tickets duplicados
- [ ] Si el webhook se procesa 2 veces, no se crean transferencias duplicadas

### ✅ Verificaciones de Auditoría:

- [ ] Cada cambio de `payment_status` se registra en `audit_logs`
- [ ] `old_value` y `new_value` son correctos
- [ ] `triggered_by` es `mercadopago_webhook`
- [ ] `metadata` contiene información útil

---

## 8️⃣ Troubleshooting

### Problema: No aparecen registros en `webhook_logs`

**Posibles causas:**
1. La migración no se ejecutó correctamente
2. El webhook no llegó (verificar en Mercado Pago)
3. Hay un error en el código (verificar logs de Vercel)

**Solución:**
```sql
-- Verificar que las tablas existen
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('webhook_logs', 'audit_logs');

-- Verificar RLS
SELECT * FROM pg_policies WHERE tablename = 'webhook_logs';
```

### Problema: Aparecen registros duplicados

**Posible causa:** La verificación de idempotencia no está funcionando

**Solución:**
```sql
-- Verificar que el UNIQUE constraint existe
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'webhook_logs' 
  AND constraint_type = 'UNIQUE';
```

### Problema: No puedo ver los logs (RLS)

**Causa:** No sos admin

**Solución:**
```sql
-- Verificar tu rol
SELECT id, role FROM profiles WHERE id = auth.uid();

-- Si no sos admin, pedirle a un admin que te cambie el rol
```

---

## 9️⃣ Queries Útiles para Debugging

### Ver todos los webhooks de hoy:

```sql
SELECT 
  payment_id,
  purchase_id,
  payment_status,
  processed_at
FROM webhook_logs
WHERE DATE(processed_at) = CURRENT_DATE
ORDER BY processed_at DESC;
```

### Ver todos los cambios de estado de hoy:

```sql
SELECT 
  entity_id,
  action,
  old_value,
  new_value,
  triggered_by,
  created_at
FROM audit_logs
WHERE entity_type = 'purchase'
  AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

### Ver compras sin webhook log (posible problema):

```sql
SELECT 
  p.id,
  p.payment_provider_id,
  p.payment_status,
  p.created_at
FROM purchases p
LEFT JOIN webhook_logs wl ON wl.purchase_id = p.id
WHERE p.payment_provider_id IS NOT NULL
  AND wl.id IS NULL
ORDER BY p.created_at DESC;
```

---

## 🎯 Resultado Esperado

Después de seguir estos pasos, deberías tener:

1. ✅ Tablas `webhook_logs` y `audit_logs` creadas
2. ✅ Un pago de prueba realizado
3. ✅ Registros en ambas tablas
4. ✅ Verificación de que la idempotencia funciona
5. ✅ Verificación de que la auditoría registra cambios

---

## 📝 Notas Finales

- **Primera vez:** Puede tardar unos minutos en aparecer los logs (webhook puede tener delay)
- **Testing:** Usar pagos pequeños para testing
- **Producción:** Monitorear los logs regularmente para detectar problemas
- **RLS:** Solo admins pueden ver los logs (por seguridad)
