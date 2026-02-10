# Tests Principales para Producción - Guía Paso a Paso

## 🎯 Objetivo

Esta guía cubre los **tests INDISPENSABLES** que debés hacer antes de salir a mercado. Son los casos críticos que garantizan que el sistema funciona correctamente.

---

## 📋 Tests Principales (En Orden de Prioridad)

### ✅ TEST 1: Pago Exitoso (CRÍTICO)
### ✅ TEST 2: Pago Fallido/Rechazado (CRÍTICO)
### ✅ TEST 3: Verificación de Transferencias (CRÍTICO)

---

## ✅ TEST 1: Pago Exitoso

**Objetivo:** Verificar que cuando un pago se completa exitosamente, todo funciona correctamente.

**Por qué es crítico:** Es el flujo principal del negocio. Si esto no funciona, no podés vender.

### Pasos:

1. **Crear un evento de prueba**
   - Ir a `/dashboard/eventos/nuevo`
   - Crear evento con fecha futura (mínimo 24hs)
   - Agregar un tipo de ticket de $10.00
   - Publicar el evento

2. **Realizar compra como usuario**
   - Ir al evento público
   - Agregar 1 ticket al carrito
   - Completar checkout (puede ser como invitado)
   - Ir a Mercado Pago y pagar con tarjeta válida

3. **Verificar en Supabase (inmediatamente después del pago):**

```sql
-- Obtener la última compra
SELECT 
  id,
  total_amount,
  base_amount,
  commission_amount,
  payment_status,
  payment_provider_id,
  created_at,
  updated_at
FROM purchases
ORDER BY created_at DESC
LIMIT 1;
```

**Resultados esperados:**
- ✅ `payment_status`: "completed"
- ✅ `payment_provider_id`: Debe tener un ID (número de Mercado Pago)
- ✅ `total_amount`: $11.50 (si el ticket es $10.00)
- ✅ `base_amount`: $10.00
- ✅ `commission_amount`: $1.50 (15%)

4. **Verificar que se crearon tickets:**

```sql
-- Verificar tickets de la compra
SELECT 
  t.id,
  t.ticket_number,
  t.qr_code,
  t.status,
  tt.name as ticket_type_name,
  e.name as event_name
FROM tickets t
INNER JOIN ticket_types tt ON t.ticket_type_id = tt.id
INNER JOIN events e ON t.event_id = e.id
INNER JOIN purchases p ON t.purchase_id = p.id
WHERE p.id = 'ID_DE_LA_COMPRA'
ORDER BY t.created_at;
```

**Resultados esperados:**
- ✅ Debe haber 1 ticket (o la cantidad que compraste)
- ✅ `ticket_number`: Debe tener formato "EVT-XXXXXXXX-XXXXXX-XXX"
- ✅ `qr_code`: Debe tener formato "SYN-XXXXXXXX-XXXXXXXX"
- ✅ `status`: "valid"

5. **Verificar que se creó transferencia:**

```sql
-- Verificar transferencia
SELECT 
  t.id,
  t.amount,
  t.status,
  t.scheduled_at,
  p.payment_status,
  e.name as event_name
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
INNER JOIN events e ON t.event_id = e.id
WHERE p.id = 'ID_DE_LA_COMPRA';
```

**Resultados esperados:**
- ✅ Debe existir 1 transferencia
- ✅ `amount`: $10.00 (precio base, sin comisión)
- ✅ `status`: "pending"
- ✅ `scheduled_at`: Debe ser 240 horas (10 días) después de `purchase.created_at`

6. **Verificar en la app:**

**En "Mis Compras" (`/mis-compras`):**
- [ ] La compra aparece con estado "Completado" (badge verde)
- [ ] Se muestran los tickets con QR codes
- [ ] Se puede descargar PDF de tickets
- [ ] El total es correcto ($11.50)

**En Dashboard de Productora (`/dashboard`):**
- [ ] Aparece la transferencia en "Transferencias Recientes"
- [ ] Estado: "Pendiente" (amarillo)
- [ ] Monto: $10.00 (precio base)

7. **Verificar email:**

- [ ] Se recibió email con tickets
- [ ] El email contiene los QR codes
- [ ] El email tiene la información del evento

8. **Verificar en logs de Vercel:**

- [ ] Log: `✅ Compra X actualizada a estado: completed`
- [ ] Log: `✅ X tickets creados para compra X`
- [ ] Log: `✅ Transferencia creada para compra X`
- [ ] Log: `💰 Gastos operativos: $X.XX`
- [ ] Log: `💵 Margen neto: $X.XX`

### ✅ Checklist TEST 1:
- [ ] Pago se completó exitosamente
- [ ] `payment_status = 'completed'` en BD
- [ ] Se crearon tickets (cantidad correcta)
- [ ] Tickets tienen QR codes válidos
- [ ] Se creó transferencia con monto correcto
- [ ] Transferencia está en estado 'pending'
- [ ] Aparece en "Mis Compras" con tickets visibles
- [ ] Aparece en Dashboard de productora
- [ ] Se envió email con tickets
- [ ] No hay errores en logs

---

## ✅ TEST 2: Pago Fallido/Rechazado

**Objetivo:** Verificar que cuando un pago es rechazado, NO se crean tickets ni transferencias.

**Por qué es crítico:** Si se crean tickets para pagos fallidos, los usuarios podrían entrar sin pagar.

### Pasos:

1. **Crear un evento de prueba** (o usar el mismo del TEST 1)

2. **Realizar compra con pago que será rechazado**
   - Ir al evento público
   - Agregar 1 ticket al carrito
   - Completar checkout
   - En Mercado Pago, usar tarjeta que será rechazada (o simular rechazo)
   - El pago será rechazado

3. **Verificar en Supabase (después del rechazo):**

```sql
-- Obtener la última compra
SELECT 
  id,
  total_amount,
  payment_status,
  payment_provider_id,
  payment_provider_data->>'status' as mp_status,
  payment_provider_data->>'status_detail' as mp_status_detail,
  created_at,
  updated_at
FROM purchases
ORDER BY created_at DESC
LIMIT 1;
```

**Resultados esperados:**
- ✅ `payment_status`: "failed"
- ✅ `payment_provider_id`: Debe tener un ID (Mercado Pago crea el pago aunque falle)
- ✅ `mp_status`: "rejected" o "cancelled"
- ✅ `mp_status_detail`: Detalle del rechazo (ej: "cc_rejected_insufficient_amount")

4. **Verificar que NO se crearon tickets:**

```sql
-- Verificar que NO hay tickets
SELECT COUNT(*) as tickets_creados
FROM tickets
WHERE purchase_id = 'ID_DE_LA_COMPRA';
```

**Resultados esperados:**
- ✅ `tickets_creados`: 0 (NO debe haber tickets)

5. **Verificar que NO se creó transferencia:**

```sql
-- Verificar que NO hay transferencia
SELECT COUNT(*) as transferencias_creadas
FROM transfers
WHERE purchase_id = 'ID_DE_LA_COMPRA';
```

**Resultados esperados:**
- ✅ `transferencias_creadas`: 0 (NO debe haber transferencia)

6. **Verificar quantity_sold en ticket_types:**

```sql
-- Verificar que quantity_sold NO cambió
SELECT 
  id,
  name,
  quantity_available,
  quantity_sold
FROM ticket_types
WHERE id = 'ID_DEL_TICKET_TYPE';
```

**Resultados esperados:**
- ✅ `quantity_sold`: NO debe haber aumentado (debe ser el mismo que antes)

7. **Verificar en la app:**

**En "Mis Compras" (`/mis-compras`):**
- [ ] La compra NO aparece (se oculta automáticamente)
- [ ] Si aparece, debe mostrar estado "Fallido" (badge rojo)
- [ ] NO se muestran tickets
- [ ] Mensaje: "El pago fue rechazado. No se generaron tickets."

**En Dashboard de Productora (`/dashboard`):**
- [ ] NO aparece transferencia para esta compra
- [ ] La compra fallida NO aparece en transferencias

8. **Verificar email:**

- [ ] NO se recibió email con tickets
- [ ] NO se debe enviar email para pagos fallidos

9. **Verificar en logs de Vercel:**

- [ ] Log: `✅ Compra X actualizada a estado: failed`
- [ ] NO debe aparecer: "tickets creados"
- [ ] NO debe aparecer: "Transferencia creada"

### ✅ Checklist TEST 2:
- [ ] Pago fue rechazado
- [ ] `payment_status = 'failed'` en BD
- [ ] NO se crearon tickets (0 tickets)
- [ ] NO se creó transferencia (0 transferencias)
- [ ] `quantity_sold` NO cambió en ticket_types
- [ ] Compra NO aparece en "Mis Compras" (o aparece como fallida)
- [ ] NO se envió email
- [ ] NO aparece en Dashboard de productora
- [ ] No hay errores en logs

---

## ✅ TEST 3: Verificación de Transferencias

**Objetivo:** Verificar que las transferencias se crean correctamente y solo para pagos exitosos.

**Por qué es crítico:** Las transferencias son cómo las productoras reciben su dinero.

### Pasos:

1. **Realizar un pago exitoso** (TEST 1)

2. **Verificar transferencia en Supabase:**

```sql
-- Verificar transferencia completa
SELECT 
  t.id as transfer_id,
  t.amount as transfer_amount,
  t.status as transfer_status,
  t.scheduled_at,
  t.created_at as transfer_created_at,
  p.id as purchase_id,
  p.base_amount as purchase_base_amount,
  p.payment_status,
  p.created_at as purchase_created_at,
  e.name as event_name,
  pr.business_name as producer_name
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
INNER JOIN events e ON t.event_id = e.id
INNER JOIN producers pr ON t.producer_id = pr.id
WHERE p.id = 'ID_DE_LA_COMPRA';
```

**Resultados esperados:**
- ✅ `transfer_amount` = `purchase_base_amount` (precio base, sin comisión)
- ✅ `transfer_status`: "pending"
- ✅ `scheduled_at`: Debe ser 240 horas después de `purchase.created_at`
- ✅ `purchase_payment_status`: "completed"

3. **Verificar en Dashboard de Productora:**

**En `/dashboard`:**
- [ ] Aparece en "Transferencias Recientes"
- [ ] Estado: "Pendiente" (badge amarillo)
- [ ] Monto correcto (precio base)
- [ ] Fecha de creación correcta

**En `/dashboard/transferencias`:**
- [ ] Aparece en la lista completa
- [ ] Estado: "Pendiente"
- [ ] Monto: $10.00 (precio base)
- [ ] Botón "Procesar transferencia" visible (aunque no funcione todavía)

4. **Verificar que NO hay transferencias de pagos fallidos:**

```sql
-- Verificar que NO hay transferencias de pagos fallidos
SELECT COUNT(*) as transferencias_de_pagos_fallidos
FROM transfers t
INNER JOIN purchases p ON t.purchase_id = p.id
WHERE p.payment_status = 'failed';
```

**Resultados esperados:**
- ✅ `transferencias_de_pagos_fallidos`: 0

### ✅ Checklist TEST 3:
- [ ] Transferencia se creó automáticamente
- [ ] Monto correcto (precio base)
- [ ] Estado: "pending"
- [ ] `scheduled_at` correcto (240 horas después)
- [ ] Aparece en Dashboard de productora
- [ ] NO hay transferencias de pagos fallidos
- [ ] Relación con compra correcta

---

## 🔄 Correlaciones y Flujos Completos

### Flujo: Pago Exitoso → Todo se Crea

```
Pago Exitoso
    ↓
✅ Compra: payment_status = 'completed'
✅ Tickets: Se crean (cantidad correcta)
✅ Transferencia: Se crea (monto = base_amount)
✅ Email: Se envía con tickets
✅ Dashboard: Aparece transferencia
✅ Mis Compras: Aparece con tickets
```

### Flujo: Pago Fallido → Nada se Crea

```
Pago Fallido
    ↓
✅ Compra: payment_status = 'failed'
❌ Tickets: NO se crean (0 tickets)
❌ Transferencia: NO se crea (0 transferencias)
❌ Email: NO se envía
❌ Dashboard: NO aparece transferencia
❌ Mis Compras: NO aparece (o aparece como fallida)
```

---

## 📊 Resumen de Verificaciones por Test

| Test | Compra Status | Tickets | Transferencia | Email | Mis Compras | Dashboard |
|------|---------------|---------|---------------|-------|-------------|-----------|
| TEST 1: Pago Exitoso | ✅ completed | ✅ Creados | ✅ Creada | ✅ Enviado | ✅ Visible | ✅ Visible |
| TEST 2: Pago Fallido | ✅ failed | ❌ NO creados | ❌ NO creada | ❌ NO enviado | ❌ Oculto | ❌ NO visible |

---

## 🚨 Tests Adicionales Recomendados (Opcionales)

### TEST 4: Reembolso
- Cuando se procesa un reembolso, la transferencia debe marcarse como 'cancelled'
- Los tickets deben marcarse como 'refunded'

### TEST 5: Pago Pendiente
- Si el pago queda en 'pending', no se deben crear tickets ni transferencias
- El usuario debe poder ver el estado "Pendiente"

---

## ✅ Checklist Final para Salir a Mercado

Antes de usar el software en producción, verificá que:

### Tests Críticos Completados:
- [ ] TEST 1: Pago exitoso funciona perfectamente
- [ ] TEST 2: Pago fallido NO crea tickets ni transferencias
- [ ] TEST 3: Transferencias se crean solo para pagos exitosos

### Verificaciones Adicionales:
- [ ] No hay errores en logs de Vercel
- [ ] Los emails se envían correctamente
- [ ] Los QR codes se generan correctamente
- [ ] El dashboard de productora muestra datos correctos
- [ ] "Mis Compras" funciona correctamente
- [ ] Los cálculos financieros son correctos

---

## 🎉 Siguiente Paso

Una vez que estos 3 tests principales pasen, podés usar el software en producción con confianza.

**Recomendación:** Hacé estos tests con montos pequeños ($10-20) antes de eventos grandes.
