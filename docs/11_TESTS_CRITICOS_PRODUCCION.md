# Tests Críticos para Producción - Mercado Pago

## 🎯 Objetivo

Esta guía cubre todos los tests fundamentales y necesarios para usar el software en producción de forma segura y confiable.

---

## 📋 Índice de Tests

### Tests Básicos (Ya completados)
- ✅ TEST 1: App carga correctamente
- ✅ TEST 2: Crear preferencia (sin pagar)
- ✅ TEST 3: Cálculos financieros
- ✅ TEST 4: Protección de datos sensibles
- ✅ TEST 5: Pago real (pequeño)
- ✅ TEST 6: Webhook funciona
- ✅ TEST 7: Validación plazo mínimo

### Tests Críticos Adicionales (Esta guía)
- 🔴 **TEST 8: Pago rechazado/fallido**
- 🔴 **TEST 9: Reembolsos - Derecho de arrepentimiento**
- 🔴 **TEST 10: Reembolsos - Cancelación de evento**
- 🔴 **TEST 11: Reembolsos - Cambio de fecha/lugar**
- 🔴 **TEST 12: Webhook con estado refunded**
- 🔴 **TEST 13: Validación de seguridad (RLS)**
- 🔴 **TEST 14: Edge cases - Pagos duplicados**
- 🔴 **TEST 15: Edge cases - Webhook sin external_reference**

---

## 🔴 TEST 8: Pago Rechazado/Fallido

**Objetivo:** Verificar que cuando un pago es rechazado en Mercado Pago, el sistema actualiza correctamente el estado.

**Por qué es crítico:** Si un pago falla, el usuario debe poder ver el estado correcto y no debe recibir tickets.

**Pasos:**
1. Crear un evento de prueba con ticket de $10.00
2. Iniciar checkout normalmente
3. En Mercado Pago, usar una tarjeta que será rechazada (o simular rechazo)
4. Completar el pago (será rechazado)

**Qué verificar:**

**En Supabase:**
```sql
-- Verificar que el pago se marcó como failed
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
WHERE id = 'ID_DE_LA_COMPRA'
ORDER BY created_at DESC
LIMIT 1;
```

**Qué deberías ver:**
- `payment_status`: "failed" ✅
- `payment_provider_id`: ID del pago en Mercado Pago ✅
- `mp_status`: "rejected" o "cancelled" ✅
- `mp_status_detail`: Detalle del rechazo (ej: "cc_rejected_insufficient_amount") ✅

**En la app:**
- [ ] El usuario NO recibe tickets por email
- [ ] En "Mis Compras", el estado aparece como "Fallido" o "Rechazado"
- [ ] El usuario puede ver el motivo del rechazo (si está disponible)

**En logs de Vercel:**
- [ ] El webhook se ejecutó correctamente
- [ ] Log: `✅ Compra X actualizada a estado: failed`

**⚠️ IMPORTANTE:**
- Si el pago falla, NO se deben generar tickets
- Si el pago falla, NO se deben calcular gastos operativos
- El usuario debe poder intentar pagar nuevamente

---

## 🔴 TEST 9: Reembolsos - Derecho de Arrepentimiento

**Objetivo:** Verificar que los reembolsos por derecho de arrepentimiento funcionan correctamente.

**Por qué es crítico:** Es un derecho legal del consumidor (Art. 34 Ley 24.240). Debe funcionar perfectamente.

**Condiciones del derecho de arrepentimiento:**
- ✅ Dentro de 10 días desde la compra
- ✅ Al menos 24 horas antes del evento
- ✅ Reembolso completo (incluye cargo por servicio)

**Pasos:**
1. Crear un evento que empiece en más de 24 horas
2. Realizar una compra y pagarla (TEST 5)
3. Esperar a que el pago se complete (verificar en Supabase)
4. Como admin, ir a `/admin/reembolsos`
5. Crear una solicitud de reembolso por "Derecho de arrepentimiento"
6. Procesar el reembolso

**Qué verificar antes de procesar:**

**En Supabase:**
```sql
-- Verificar que la compra cumple las condiciones
SELECT 
  p.id,
  p.created_at,
  p.payment_status,
  e.start_date,
  -- Días desde la compra
  EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400 as days_since_purchase,
  -- Horas hasta el evento
  EXTRACT(EPOCH FROM (e.start_date - NOW())) / 3600 as hours_until_event
FROM purchases p
JOIN events e ON p.event_id = e.id
WHERE p.id = 'ID_DE_LA_COMPRA';
```

**Condiciones que deben cumplirse:**
- `days_since_purchase` <= 10 ✅
- `hours_until_event` >= 24 ✅
- `payment_status` = 'completed' ✅

**Qué verificar después de procesar:**

**En Supabase:**
```sql
-- Verificar que el reembolso se procesó correctamente
SELECT 
  r.id,
  r.status,
  r.refund_amount,
  r.refund_type,
  r.processed_at,
  r.processed_by,
  p.payment_status,
  p.payment_provider_id,
  t.status as ticket_status
FROM refunds r
JOIN purchases p ON r.purchase_id = p.id
LEFT JOIN tickets t ON t.purchase_id = p.id
WHERE r.id = 'ID_DEL_REEMBOLSO';
```

**Qué deberías ver:**
- `r.status`: "approved" ✅
- `r.refund_amount`: Monto total (incluye cargo por servicio) ✅
- `r.refund_type`: "right_of_withdrawal" ✅
- `p.payment_status`: "refunded" ✅
- `t.status`: "refunded" (para todos los tickets) ✅
- `r.processed_at`: Fecha de procesamiento ✅

**En Mercado Pago:**
1. Ir a: https://www.mercadopago.com.ar/activities
2. Buscar el pago original
3. Verificar que aparece el reembolso

**En logs de Vercel:**
- [ ] Log: `✅ Reembolso procesado correctamente`
- [ ] No hay errores en la API de reembolsos

**⚠️ IMPORTANTE:**
- El reembolso debe ser del 100% (incluye cargo por servicio)
- Los tickets deben marcarse como "refunded"
- El webhook de Mercado Pago debe actualizar el estado a "refunded"

---

## 🔴 TEST 10: Reembolsos - Cancelación de Evento

**Objetivo:** Verificar que cuando se cancela un evento, los reembolsos se procesan correctamente.

**Por qué es crítico:** Si un evento se cancela, TODOS los compradores deben recibir reembolso completo.

**Pasos:**
1. Crear un evento con múltiples compras (mínimo 2)
2. Realizar 2 compras diferentes y pagarlas
3. Como admin, cancelar el evento (cambiar status a 'cancelled')
4. Para cada compra, crear solicitud de reembolso por "Cancelación de evento"
5. Procesar cada reembolso

**Qué verificar:**

**En Supabase:**
```sql
-- Verificar todas las compras del evento cancelado
SELECT 
  p.id,
  p.payment_status,
  p.total_amount,
  r.id as refund_id,
  r.status as refund_status,
  r.refund_amount,
  COUNT(t.id) as tickets_count
FROM purchases p
JOIN events e ON p.event_id = e.id
LEFT JOIN refunds r ON r.purchase_id = p.id
LEFT JOIN tickets t ON t.purchase_id = p.id
WHERE e.id = 'ID_DEL_EVENTO'
GROUP BY p.id, r.id;
```

**Qué deberías ver:**
- Todas las compras con `payment_status` = 'completed' tienen reembolsos ✅
- Todos los reembolsos con `status` = 'approved' ✅
- `refund_amount` = `total_amount` (reembolso completo) ✅
- Todos los tickets con `status` = 'refunded' ✅

**⚠️ IMPORTANTE:**
- El reembolso debe ser del 100% (incluye cargo por servicio)
- Debe funcionar sin importar cuántos días pasaron desde la compra
- Debe funcionar sin importar cuántas horas faltan para el evento

---

## 🔴 TEST 11: Reembolsos - Cambio de Fecha/Lugar

**Objetivo:** Verificar que los reembolsos por cambio de fecha/lugar solo reembolsan el precio base (sin cargo por servicio).

**Por qué es crítico:** Según la lógica de negocio, el cargo por servicio NO es reembolsable en estos casos.

**Tipos de reembolsos:**
- `date_change`: Cambio de fecha/horario
- `venue_change`: Cambio de lugar
- Ambos reembolsan solo `base_amount` (NO `total_amount`)

**Pasos:**
1. Realizar una compra de $10.00 (total: $11.50 con cargo por servicio)
2. Pagar la compra
3. Como admin, crear solicitud de reembolso por "Cambio de fecha" o "Cambio de lugar"
4. Procesar el reembolso

**Qué verificar:**

**En Supabase:**
```sql
-- Verificar el monto reembolsado
SELECT 
  r.id,
  r.refund_type,
  r.refund_amount,
  p.base_amount,
  p.total_amount,
  p.commission_amount,
  -- Verificar que el reembolso es solo del precio base
  CASE 
    WHEN r.refund_amount = p.base_amount THEN '✅ Correcto'
    ELSE '❌ Incorrecto'
  END as validation
FROM refunds r
JOIN purchases p ON r.purchase_id = p.id
WHERE r.id = 'ID_DEL_REEMBOLSO';
```

**Qué deberías ver:**
- `refund_amount` = `base_amount` (ej: $10.00) ✅
- `refund_amount` ≠ `total_amount` (ej: NO $11.50) ✅
- `refund_amount` = `total_amount` - `commission_amount` ✅

**Ejemplo:**
- Ticket: $10.00
- Cargo por servicio (15%): $1.50
- Total: $11.50
- **Reembolso esperado:** $10.00 (solo precio base)

**⚠️ IMPORTANTE:**
- El cargo por servicio ($1.50) NO se reembolsa
- Los tickets deben marcarse como "refunded"
- El usuario debe entender que solo recibe el precio base

---

## 🔴 TEST 12: Webhook con Estado Refunded

**Objetivo:** Verificar que cuando Mercado Pago procesa un reembolso, el webhook actualiza correctamente el estado.

**Por qué es crítico:** Si el reembolso se procesa directamente en Mercado Pago (no desde nuestra app), el webhook debe sincronizar el estado.

**Pasos:**
1. Realizar una compra y pagarla
2. En Mercado Pago (panel web), procesar un reembolso manualmente
3. Esperar a que el webhook se ejecute (puede tardar unos minutos)
4. Verificar que el estado se actualizó

**Qué verificar:**

**En logs de Vercel:**
- [ ] Webhook recibido con `type: 'payment'`
- [ ] `payment.status` = 'refunded' o 'charged_back'
- [ ] Log: `✅ Compra X actualizada a estado: refunded`

**En Supabase:**
```sql
-- Verificar que el estado se actualizó
SELECT 
  id,
  payment_status,
  payment_provider_data->>'status' as mp_status,
  updated_at
FROM purchases
WHERE id = 'ID_DE_LA_COMPRA';
```

**Qué deberías ver:**
- `payment_status`: "refunded" ✅
- `mp_status`: "refunded" o "charged_back" ✅
- `updated_at`: Fecha reciente (después del reembolso) ✅

**⚠️ IMPORTANTE:**
- El webhook debe manejar tanto `refunded` como `charged_back`
- Los tickets deben actualizarse a "refunded" (esto puede requerir lógica adicional)

---

## 🔴 TEST 13: Validación de Seguridad (RLS)

**Objetivo:** Verificar que los usuarios/productores NO pueden ver datos financieros sensibles.

**Por qué es crítico:** Protección de datos sensibles es fundamental para la seguridad.

**Pasos:**
1. Como usuario/productor (NO admin), intentar acceder a datos financieros
2. Verificar que las vistas públicas funcionan correctamente
3. Verificar que las vistas admin solo funcionan para admins

**Qué verificar:**

**Como usuario/productor (en Supabase SQL Editor):**
```sql
-- Intentar ver datos financieros directamente (debe fallar o no mostrar campos sensibles)
SELECT * FROM purchases WHERE id = 'ID_DE_LA_COMPRA';

-- Ver vista pública (debe funcionar, sin campos sensibles)
SELECT * FROM purchases_public WHERE id = 'ID_DE_LA_COMPRA';

-- Intentar ver vista admin (debe devolver 0 filas si no sos admin)
SELECT * FROM purchases_admin WHERE id = 'ID_DE_LA_COMPRA';
```

**Qué deberías ver:**
- `purchases_public`: Solo campos públicos (sin `operating_costs`, `net_margin`, etc.) ✅
- `purchases_admin`: 0 filas (porque no sos admin) ✅

**En la app (como usuario/productor):**
- [ ] En "Mis Compras", NO se ven campos financieros sensibles
- [ ] En el dashboard del productor, NO se ven campos financieros sensibles
- [ ] Solo se ven: `total_amount`, `base_amount`, `commission_amount`, `payment_status`

**Como admin:**
- [ ] En el panel admin, SÍ se ven todos los campos financieros
- [ ] `purchases_admin` devuelve datos completos

**⚠️ IMPORTANTE:**
- Las RLS policies deben estar activas
- Las vistas deben estar correctamente configuradas
- No debe haber forma de acceder a datos sensibles sin ser admin

---

## 🔴 TEST 14: Edge Cases - Pagos Duplicados

**Objetivo:** Verificar que si se crean múltiples preferencias para la misma compra, el sistema maneja correctamente los webhooks.

**Por qué es crítico:** Un usuario podría intentar pagar múltiples veces, o el webhook podría llegar múltiples veces.

**Pasos:**
1. Crear una compra
2. Crear preferencia de pago (TEST 2)
3. NO pagar, volver a la app
4. Crear otra preferencia de pago (mismo purchase_id)
5. Pagar con la segunda preferencia
6. Verificar que solo se procesa un pago

**Qué verificar:**

**En Supabase:**
```sql
-- Verificar que solo hay un pago completado
SELECT 
  id,
  payment_status,
  payment_provider_id,
  COUNT(*) OVER (PARTITION BY payment_provider_id) as duplicate_count
FROM purchases
WHERE id = 'ID_DE_LA_COMPRA';
```

**Qué deberías ver:**
- Solo un registro con `payment_status` = 'completed' ✅
- `payment_provider_id` único (no duplicado) ✅

**En logs de Vercel:**
- [ ] Si el webhook llega múltiples veces, debe ser idempotente
- [ ] No debe haber errores por actualizaciones duplicadas

**⚠️ IMPORTANTE:**
- El webhook debe ser idempotente (múltiples llamadas = mismo resultado)
- No debe generar tickets duplicados
- No debe calcular gastos operativos duplicados

---

## 🔴 TEST 15: Edge Cases - Webhook sin external_reference

**Objetivo:** Verificar que el webhook maneja correctamente pagos sin `external_reference`.

**Por qué es crítico:** Si Mercado Pago envía un webhook sin `external_reference`, no podemos identificar la compra.

**Pasos:**
1. Simular un webhook sin `external_reference` (o usar un pago que no tiene referencia)
2. Verificar que el webhook responde correctamente sin fallar

**Qué verificar:**

**En logs de Vercel:**
- [ ] El webhook NO debe fallar (no debe devolver 500)
- [ ] Debe devolver 400 con mensaje: "Purchase ID no encontrado"
- [ ] Debe loguear: `⚠️ External reference no encontrado en el pago`

**En Supabase:**
- [ ] No se deben crear registros incorrectos
- [ ] No se deben actualizar compras incorrectas

**⚠️ IMPORTANTE:**
- El webhook debe validar `external_reference` antes de procesar
- Debe responder con error 400 (no 500) si falta la referencia
- No debe afectar otras compras

---

## 📊 Resumen de Tests Críticos

| Test | Descripción | Crítico | Prioridad | Estado |
|------|-------------|---------|-----------|--------|
| TEST 8 | Pago rechazado/fallido | 🔴 Sí | Alta | [ ] |
| TEST 9 | Reembolso - Derecho arrepentimiento | 🔴 Sí | Alta | [ ] |
| TEST 10 | Reembolso - Cancelación evento | 🔴 Sí | Alta | [ ] |
| TEST 11 | Reembolso - Cambio fecha/lugar | 🔴 Sí | Media | [ ] |
| TEST 12 | Webhook estado refunded | 🔴 Sí | Media | [ ] |
| TEST 13 | Validación seguridad (RLS) | 🔴 Sí | Alta | [ ] |
| TEST 14 | Edge cases - Pagos duplicados | ⚠️ Medio | Baja | [ ] |
| TEST 15 | Edge cases - Webhook sin referencia | ⚠️ Medio | Baja | [ ] |

---

## 🚨 Tests Adicionales Recomendados (Opcionales)

### TEST 16: Reembolso Parcial
- **Objetivo:** Verificar que se pueden procesar reembolsos parciales (solo algunos tickets de una compra)
- **Prioridad:** Media
- **Cuándo hacerlo:** Si implementás reembolsos parciales

### TEST 17: Múltiples Reembolsos en la Misma Compra
- **Objetivo:** Verificar que no se puede reembolsar más de una vez
- **Prioridad:** Media
- **Cuándo hacerlo:** Si permitís reembolsos parciales

### TEST 18: Reembolso Fuera de Plazo
- **Objetivo:** Verificar que el sistema rechaza reembolsos fuera del plazo de derecho de arrepentimiento
- **Prioridad:** Media
- **Cuándo hacerlo:** Para validar la lógica de plazos

### TEST 19: Webhook con Datos Inválidos
- **Objetivo:** Verificar que el webhook maneja datos malformados
- **Prioridad:** Baja
- **Cuándo hacerlo:** Para robustez del sistema

### TEST 20: Transferencia a Productor
- **Objetivo:** Verificar que las transferencias a productores funcionan después de 240 horas
- **Prioridad:** Alta (cuando implementes transferencias)
- **Cuándo hacerlo:** Cuando tengas la funcionalidad de transferencias

---

## ✅ Checklist Final para Producción

Antes de usar el software en producción, verificá que:

### Tests Básicos
- [ ] TEST 1-7 completados (ver `10_GUIA_TESTEO_PRODUCCION.md`)

### Tests Críticos
- [ ] TEST 8: Pago rechazado funciona
- [ ] TEST 9: Reembolso derecho de arrepentimiento funciona
- [ ] TEST 10: Reembolso cancelación funciona
- [ ] TEST 11: Reembolso cambio fecha/lugar funciona
- [ ] TEST 12: Webhook refunded funciona
- [ ] TEST 13: RLS funciona correctamente
- [ ] TEST 14: Pagos duplicados manejados
- [ ] TEST 15: Webhook sin referencia manejado

### Validaciones Adicionales
- [ ] No hay errores en logs de Vercel
- [ ] Los emails de tickets se envían correctamente
- [ ] Los cálculos financieros son correctos en todos los casos
- [ ] La protección de datos sensibles funciona
- [ ] El webhook responde correctamente a todos los estados

---

## 🎉 Siguiente Paso

Una vez que todos los tests críticos pasen, podés usar el software en producción con confianza.

**Recomendación:** Hacé estos tests con montos pequeños ($10-20) antes de eventos grandes.

---

## 📝 Notas Importantes

1. **Reembolsos:** Los reembolsos pueden tardar 5-10 días hábiles en acreditarse en la cuenta del usuario (según Mercado Pago).

2. **Webhooks:** Los webhooks pueden llegar con retraso (hasta 5 minutos). Si no llega, podés consultar el estado del pago directamente en Mercado Pago.

3. **Seguridad:** Nunca expongas datos financieros sensibles en el frontend. Siempre validá permisos en el backend.

4. **Idempotencia:** El webhook debe ser idempotente. Múltiples llamadas con los mismos datos no deben causar problemas.

5. **Logs:** Revisá los logs de Vercel regularmente para detectar problemas temprano.
