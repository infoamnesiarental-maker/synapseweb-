# Mini Tests MVP - 3 Casos Esenciales

## 🎯 Objetivo

Verificar que los requisitos MVP funcionan correctamente con 3 tests simples:
1. **Pago Válido/Exitoso**
2. **Pago Rechazado**
3. **Devolución/Reembolso**

---

## 📋 TEST 1: Pago Válido/Exitoso

### Pasos:
1. Crear un evento de prueba
2. Comprar un ticket (monto pequeño, ej: $10)
3. Completar el pago en Mercado Pago exitosamente
4. Esperar 1-2 minutos (webhook)

### ✅ Qué DEBE pasar:

#### En `/mis-compras` (Comprador):
- [ ] **SÍ aparece** la compra con estado "Completado" (verde) ✅
- [ ] Muestra el nombre del evento
- [ ] Muestra el total pagado (ej: "$11,50")
- [ ] Muestra la cantidad de tickets (ej: "1")
- [ ] Al expandir, muestra los tickets con QR codes
- [ ] Puede descargar PDF con tickets
- [ ] Los QR codes son válidos y escaneables

#### En Dashboard de Productora:
- [ ] **SÍ aparece** en "Transferencias Recientes" ✅
- [ ] Estado: "Completada" (verde) - basado en `mp_status = 'approved'`
- [ ] Muestra el monto correcto (precio base, sin comisión, ej: "$10,00")
- [ ] Muestra el nombre del evento
- [ ] Aparece en `/dashboard/transferencias` con el mismo estado

#### En Supabase (Verificar):
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
-- payment_status: 'completed' ✅
-- mp_status: 'approved' ✅
-- payment_provider_id: ID del pago en Mercado Pago ✅

-- Verificar que se creó transferencia
SELECT 
  id,
  status,
  amount
FROM transfers
WHERE purchase_id = 'ID_DE_LA_COMPRA';

-- Resultado esperado:
-- status: 'pending' ✅
-- amount: 10.00 (precio base) ✅
```

---

## 📋 TEST 2: Pago Rechazado

### Pasos:
1. Crear un evento de prueba
2. Comprar un ticket (monto pequeño)
3. En Mercado Pago, usar una tarjeta que será rechazada (o simular rechazo)
4. Completar el pago (será rechazado)
5. Volver a la app

### ✅ Qué DEBE pasar:

#### En `/mis-compras` (Comprador):
- [ ] **NO aparece** la compra en la lista ✅ (REQUISITO 1)
- [ ] Si recargas la página, sigue sin aparecer
- [ ] No se muestra ninguna card de "Evento - Pendiente"
- [ ] No se muestra ninguna card de "Evento - Fallido"
- [ ] La lista está vacía o solo muestra otras compras válidas

#### En Dashboard de Productora:
- [ ] **NO aparece** en "Transferencias Recientes" ✅
- [ ] **NO aparece** en `/dashboard/transferencias` ✅
- [ ] Esto es correcto porque las transferencias solo se crean para pagos exitosos
- [ ] La sección de transferencias muestra: "Todavía no tenés transferencias" (si no hay otras)

#### En Supabase (Verificar):
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
-- payment_status: 'failed' ✅
-- mp_status: 'rejected' o 'cancelled' ✅
-- payment_provider_id: ID del pago en Mercado Pago (si existe) ✅

-- Verificar que NO se creó transferencia
SELECT COUNT(*) as transferencias_creadas
FROM transfers
WHERE purchase_id = 'ID_DE_LA_COMPRA';

-- Resultado esperado: 0 ✅ (NO debe haber transferencia)

-- Verificar que NO se crearon tickets
SELECT COUNT(*) as tickets_creados
FROM tickets
WHERE purchase_id = 'ID_DE_LA_COMPRA';

-- Resultado esperado: 0 ✅ (NO debe haber tickets)
```

#### Verificación Adicional:
- [ ] Si el pago fue rechazado pero el webhook no llegó, la verificación automática lo detecta
- [ ] Al entrar a `/mis-compras`, se verifica inmediatamente y actualiza el estado
- [ ] Si estaba `pending` pero Mercado Pago dice `rejected`, se actualiza a `failed` y se oculta

---

## 📋 TEST 3: Devolución/Reembolso

### Pasos:
1. Usar la compra del TEST 1 (pago exitoso)
2. Como admin, ir a `/admin/reembolsos`
3. Crear una solicitud de reembolso
4. Procesar el reembolso
5. Esperar 1-2 minutos (webhook si se procesa desde Mercado Pago)

### ✅ Qué DEBE pasar:

#### En `/mis-compras` (Comprador):
- [ ] **SÍ aparece** la compra con estado "Reembolsado" (morado) ✅
- [ ] Muestra el nombre del evento
- [ ] Muestra el total que fue reembolsado
- [ ] Al expandir, los tickets muestran badge "Reembolsado" (rojo)
- [ ] Los QR codes están tachados/deshabilitados
- [ ] Muestra información del reembolso (fecha, motivo si está disponible)
- [ ] NO puede usar los tickets para ingresar

#### En Dashboard de Productora:
- [ ] **SÍ aparece** en "Transferencias Recientes" ✅
- [ ] Estado: "Reembolsada" (morado) - basado en `mp_status = 'refunded'` o `'charged_back'` ✅
- [ ] NO aparece como "Pendiente" o "Completada"
- [ ] El monto sigue visible pero marcado como reembolsado
- [ ] Aparece en `/dashboard/transferencias` con el mismo estado
- [ ] El estado se basa en `mp_status`, no en nuestro `transfer.status`

#### En Supabase (Verificar):
```sql
-- Verificar que el reembolso se procesó
SELECT 
  p.id,
  p.payment_status,
  p.payment_provider_data->>'status' as mp_status,
  t.status as transfer_status,
  r.status as refund_status,
  r.refund_amount
FROM purchases p
LEFT JOIN transfers t ON t.purchase_id = p.id
LEFT JOIN refunds r ON r.purchase_id = p.id
WHERE p.id = 'ID_DE_LA_COMPRA';

-- Resultado esperado:
-- payment_status: 'refunded' ✅
-- mp_status: 'refunded' o 'charged_back' ✅
-- transfer_status: 'cancelled' ✅
-- refund_status: 'approved' ✅
-- refund_amount: Monto reembolsado ✅

-- Verificar que los tickets están marcados como refunded
SELECT 
  id,
  status
FROM tickets
WHERE purchase_id = 'ID_DE_LA_COMPRA';

-- Resultado esperado:
-- status: 'refunded' para todos los tickets ✅
```

---

## 📊 Resumen: Qué Aparece y Qué NO

### Para el Comprador (`/mis-compras`):

| Estado | ¿Aparece? | Estado Visual | Tickets |
|--------|-----------|---------------|---------|
| `completed` | ✅ SÍ | "Completado" (verde) | ✅ Con QR válido |
| `pending` (realmente pendiente) | ✅ SÍ | "Pendiente" (amarillo) | ⏳ "Se generarán cuando se confirme" |
| `failed` | ❌ NO | - | ❌ No aparecen |
| `refunded` | ✅ SÍ | "Reembolsado" (morado) | ❌ QR tachado/deshabilitado |

### Para el Productor (Dashboard):

| Estado MP | ¿Aparece? | Estado Visual | Nota |
|-----------|-----------|---------------|------|
| `approved` | ✅ SÍ | "Completada" (verde) | Basado en `mp_status` |
| `pending` | ✅ SÍ | "Pendiente" (amarillo) | Solo si MP realmente lo dice |
| `refunded` / `charged_back` | ✅ SÍ | "Reembolsada" (morado) | Basado en `mp_status` |
| `rejected` | ❌ NO | - | No se crea transferencia |
| `cancelled` | ❌ NO | - | No se crea transferencia |

---

## 🔍 Verificaciones Adicionales

### Verificación Automática en `/mis-compras`:
- [ ] Al cargar la página, verifica inmediatamente todas las compras `pending`
- [ ] Si alguna está rechazada, se actualiza a `failed` antes de renderizar
- [ ] Las compras rechazadas NO aparecen en la lista
- [ ] La verificación se ejecuta cada 30 segundos automáticamente

### Verificación de Estado de Mercado Pago en Dashboard:
- [ ] El dashboard filtra basándose en `mp_status` (no nuestro `payment_status`)
- [ ] Solo muestra transferencias con `mp_status`: `approved`, `pending`, `refunded`, `charged_back`
- [ ] NO muestra transferencias con `mp_status`: `rejected`, `cancelled`
- [ ] Si no hay `mp_status`, usa nuestro estado interno como fallback

---

## ✅ Checklist Final

### TEST 1: Pago Exitoso
- [ ] Comprador ve la compra con tickets y QR
- [ ] Productor ve la transferencia como "Completada" (verde)
- [ ] Estado basado en `mp_status = 'approved'`

### TEST 2: Pago Rechazado
- [ ] Comprador NO ve la compra (oculta automáticamente)
- [ ] Productor NO ve transferencia (no se crea)
- [ ] Estado actualizado a `failed` si estaba `pending`

### TEST 3: Reembolso
- [ ] Comprador ve la compra como "Reembolsado" con tickets deshabilitados
- [ ] Productor ve la transferencia como "Reembolsada" (morado)
- [ ] Estado basado en `mp_status = 'refunded'` o `'charged_back'`

---

## 🚨 Problemas Comunes

### Problema: Compra rechazada sigue apareciendo como "Pendiente"

**Solución:**
1. Recargar la página `/mis-compras`
2. Esperar 3 segundos (verificación automática)
3. Si sigue apareciendo, verificar en Supabase:
   ```sql
   SELECT payment_provider_data->>'status' FROM purchases WHERE id = 'ID';
   ```

### Problema: Dashboard no muestra estado de Mercado Pago

**Solución:**
1. Verificar que `payment_provider_data` tiene `status`:
   ```sql
   SELECT payment_provider_data->>'status' FROM purchases WHERE id = 'ID';
   ```
2. Si es `null`, el webhook no actualizó correctamente
3. Verificar logs de Vercel

### Problema: Sección de transferencias no aparece

**Solución:**
1. Ya está resuelto - ahora siempre aparece
2. Si no hay transferencias, muestra mensaje explicativo
3. Si está cargando, muestra "Cargando transferencias..."

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
2. ✅ **TEST 2 (Pago Rechazado)**: NO aparece en `/mis-compras`, NO aparece en dashboard
3. ✅ **TEST 3 (Reembolso)**: Aparece marcado como "Reembolsado/Reembolsada" en ambas secciones

**Todos los requisitos MVP cumplidos** ✅
