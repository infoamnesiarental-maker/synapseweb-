# Testing: Requisitos MVP Implementados

## 🎯 Objetivo

Verificar que los dos requisitos MVP funcionan correctamente:
1. **Requisito 1**: Compras rechazadas NO aparecen en `/mis-compras`
2. **Requisito 2**: Dashboard muestra transferencias basándose en estado de Mercado Pago

---

## 📋 Tests a Realizar

### TEST 1: Pago Realizado (Exitoso)

**Objetivo:** Verificar que un pago exitoso aparece correctamente en ambas secciones.

**Pasos:**
1. Crear un evento de prueba
2. Comprar un ticket (monto pequeño, ej: $10)
3. Completar el pago en Mercado Pago exitosamente
4. Esperar a que el webhook procese (1-2 minutos)

**Qué verificar:**

**En `/mis-compras` (como comprador):**
- [ ] Aparece la compra con estado "Completado" ✅
- [ ] Muestra el nombre del evento
- [ ] Muestra el total pagado
- [ ] Muestra la cantidad de tickets (ej: "1")
- [ ] Al expandir, muestra los tickets con QR codes
- [ ] Puede descargar PDF con tickets

**En Dashboard de Productora:**
- [ ] Aparece en "Transferencias Recientes" con estado "Completada" (verde) ✅
- [ ] El estado se basa en `mp_status = 'approved'` (no nuestro estado interno)
- [ ] Muestra el monto correcto (precio base, sin comisión)
- [ ] Aparece en `/dashboard/transferencias` con estado correcto

**En Supabase:**
```sql
-- Verificar que el pago está completado
SELECT 
  id,
  payment_status,
  payment_provider_data->>'status' as mp_status,
  payment_provider_id
FROM purchases
WHERE id = 'ID_DE_LA_COMPRA';

-- Resultado esperado:
-- payment_status: 'completed'
-- mp_status: 'approved'
-- payment_provider_id: ID del pago en Mercado Pago
```

**En logs de Vercel:**
- [ ] Webhook recibido y procesado
- [ ] Tickets creados
- [ ] Transferencia creada
- [ ] Email enviado

---

### TEST 2: Reembolso

**Objetivo:** Verificar que un reembolso se muestra correctamente en el dashboard.

**Pasos:**
1. Usar la compra del TEST 1 (pago exitoso)
2. Como admin, ir a `/admin/reembolsos`
3. Crear y procesar un reembolso
4. Esperar a que el webhook procese (si se procesa desde Mercado Pago)

**Qué verificar:**

**En `/mis-compras` (como comprador):**
- [ ] La compra aparece con estado "Reembolsado" (morado) ✅
- [ ] Los tickets muestran badge "Reembolsado"
- [ ] Los QR codes están tachados/deshabilitados
- [ ] Muestra información del reembolso

**En Dashboard de Productora:**
- [ ] La transferencia aparece con estado "Reembolsada" (morado) ✅
- [ ] El estado se basa en `mp_status = 'refunded'` o `'charged_back'`
- [ ] NO aparece como "Pendiente" o "Completada"
- [ ] El monto sigue visible pero marcado como reembolsado

**En Supabase:**
```sql
-- Verificar que el reembolso se procesó
SELECT 
  p.id,
  p.payment_status,
  p.payment_provider_data->>'status' as mp_status,
  t.status as transfer_status,
  r.status as refund_status
FROM purchases p
LEFT JOIN transfers t ON t.purchase_id = p.id
LEFT JOIN refunds r ON r.purchase_id = p.id
WHERE p.id = 'ID_DE_LA_COMPRA';

-- Resultado esperado:
-- payment_status: 'refunded'
-- mp_status: 'refunded' o 'charged_back'
-- transfer_status: 'cancelled'
-- refund_status: 'approved'
```

**En logs de Vercel:**
- [ ] Webhook recibido con estado `refunded`
- [ ] Transferencia actualizada a `cancelled`
- [ ] Tickets actualizados a `refunded`

---

### TEST 3: Pago Fallido/Rechazado

**Objetivo:** Verificar que un pago rechazado NO aparece en `/mis-compras` pero SÍ en dashboard.

**Pasos:**
1. Crear un evento de prueba
2. Comprar un ticket (monto pequeño)
3. En Mercado Pago, usar una tarjeta que será rechazada (o simular rechazo)
4. Completar el pago (será rechazado)
5. Volver a la app

**Qué verificar:**

**En `/mis-compras` (como comprador):**
- [ ] **NO aparece la compra en la lista** ✅ (REQUISITO 1)
- [ ] Si recargas la página, sigue sin aparecer
- [ ] No se muestra ninguna card de "Evento 1 - Pendiente"

**En Dashboard de Productora:**
- [ ] **NO aparece en "Transferencias Recientes"** ✅
- [ ] **NO aparece en `/dashboard/transferencias`** ✅
- [ ] Esto es correcto porque las transferencias solo se crean para pagos exitosos

**En Supabase:**
```sql
-- Verificar que el pago está marcado como failed
SELECT 
  id,
  payment_status,
  payment_provider_data->>'status' as mp_status,
  payment_provider_id
FROM purchases
WHERE id = 'ID_DE_LA_COMPRA';

-- Resultado esperado:
-- payment_status: 'failed'
-- mp_status: 'rejected' o 'cancelled'
-- payment_provider_id: ID del pago en Mercado Pago (si existe)

-- Verificar que NO se creó transferencia
SELECT COUNT(*) as transferencias_creadas
FROM transfers
WHERE purchase_id = 'ID_DE_LA_COMPRA';

-- Resultado esperado: 0 (NO debe haber transferencia)
```

**En logs de Vercel:**
- [ ] Webhook recibido con estado `rejected` o `cancelled`
- [ ] Compra actualizada a `failed`
- [ ] NO se crearon tickets
- [ ] NO se creó transferencia
- [ ] NO se envió email

**Verificación adicional:**
- [ ] Si el pago fue rechazado pero el webhook no llegó, la verificación automática lo detecta
- [ ] Al entrar a `/mis-compras`, se verifica inmediatamente y actualiza el estado
- [ ] Si estaba `pending` pero Mercado Pago dice `rejected`, se actualiza a `failed` y se oculta

---

## ✅ Checklist de Verificación

### Requisito 1: Ocultar Compras Rechazadas

- [ ] TEST 3: Pago rechazado NO aparece en `/mis-compras` ✅
- [ ] La verificación automática actualiza compras rechazadas antes de renderizar ✅
- [ ] Si el webhook no llegó, la verificación lo detecta y actualiza ✅
- [ ] Las compras realmente pendientes SÍ aparecen ✅

### Requisito 2: Dashboard Basado en Estado de Mercado Pago

- [ ] TEST 1: Pago exitoso aparece con estado "Completada" (basado en `mp_status = 'approved'`) ✅
- [ ] TEST 2: Reembolso aparece con estado "Reembolsada" (basado en `mp_status = 'refunded'`) ✅
- [ ] TEST 3: Pago rechazado NO aparece (porque no hay transferencia) ✅
- [ ] El dashboard filtra basándose en `mp_status`, no en nuestro `payment_status` ✅
- [ ] Solo muestra: `approved`, `pending`, `refunded`, `charged_back` ✅
- [ ] NO muestra: `rejected`, `cancelled` ✅

---

## 🔍 Queries SQL Útiles para Verificar

### Ver todas las compras con su estado de Mercado Pago:
```sql
SELECT 
  id,
  payment_status,
  payment_provider_data->>'status' as mp_status,
  payment_provider_id,
  created_at
FROM purchases
ORDER BY created_at DESC
LIMIT 10;
```

### Ver transferencias con estado de Mercado Pago:
```sql
SELECT 
  t.id,
  t.status as transfer_status,
  p.payment_status,
  p.payment_provider_data->>'status' as mp_status,
  t.amount,
  e.name as event_name
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
INNER JOIN events e ON t.event_id = e.id
ORDER BY t.created_at DESC
LIMIT 10;
```

### Verificar que no hay transferencias de pagos fallidos:
```sql
SELECT 
  COUNT(*) as transferencias_fallidas
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
WHERE p.payment_status = 'failed';
-- Resultado esperado: 0
```

---

## 🚨 Problemas Comunes y Soluciones

### Problema: Compra rechazada sigue apareciendo como "Pendiente"

**Causa:** El webhook no llegó o la verificación automática no se ejecutó.

**Solución:**
1. Recargar la página `/mis-compras`
2. Esperar 3 segundos (verificación automática)
3. Si sigue apareciendo, verificar en Supabase:
   ```sql
   SELECT payment_provider_data->>'status' FROM purchases WHERE id = 'ID';
   ```
4. Si Mercado Pago dice `rejected` pero nuestro estado es `pending`, el webhook no llegó

### Problema: Dashboard no muestra estado de Mercado Pago

**Causa:** `payment_provider_data` no tiene `status` o no se extrajo correctamente.

**Solución:**
1. Verificar en Supabase que `payment_provider_data` tiene `status`:
   ```sql
   SELECT payment_provider_data->>'status' FROM purchases WHERE id = 'ID';
   ```
2. Si es `null`, el webhook no actualizó correctamente
3. Verificar logs de Vercel para ver si hubo errores

---

## 📝 Notas Importantes

1. **Verificación automática**: Se ejecuta inmediatamente al cargar `/mis-compras` y cada 30 segundos
2. **Estado de Mercado Pago**: Se guarda en `payment_provider_data->>'status'` cuando llega el webhook
3. **Filtrado**: El dashboard filtra basándose en `mp_status`, pero mantiene `transfer.status` para lógica interna
4. **Performance**: La verificación puede hacer múltiples llamadas a la API, pero es necesaria para UX

---

## 🎉 Resultado Esperado

Después de completar los 3 tests:

1. ✅ **TEST 1 (Pago Exitoso)**: Aparece en ambas secciones con estado correcto
2. ✅ **TEST 2 (Reembolso)**: Aparece marcado como "Reembolsada" en ambas secciones
3. ✅ **TEST 3 (Pago Fallido)**: NO aparece en `/mis-compras`, NO aparece en dashboard (no hay transferencia)

**Todos los requisitos MVP cumplidos** ✅
