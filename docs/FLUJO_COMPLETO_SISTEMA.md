# Flujo Completo del Sistema - Anterior vs Nuevo

## 🔄 Flujo Anterior vs Nuevo

### Flujo Anterior
```
1. Usuario completa checkout
   ↓
2. Se crea compra (payment_status = 'pending')
   ↓
3. Se crea transferencia (status = 'pending') ❌ PROBLEMA: Antes del pago
   ↓
4. Usuario paga en Mercado Pago
   ↓
5a. Si pago exitoso → Webhook actualiza compra a 'completed'
5b. Si pago fallido → Webhook actualiza compra a 'failed'
   ↓
6. Necesita sincronización para corregir transferencias ❌
```

### Flujo Nuevo
```
1. Usuario completa checkout
   ↓
2. Se crea compra (payment_status = 'pending')
   ↓
3. Usuario paga en Mercado Pago
   ↓
4a. Si pago exitoso → Webhook:
    - Actualiza compra a 'completed'
    - Crea tickets ✅
    - Crea transferencia ✅ (solo aquí)
    - Envía email
    - Registra en webhook_logs (idempotencia)
    - Registra en audit_logs (auditoría)

4b. Si pago fallido → Webhook:
    - Actualiza compra a 'failed'
    - NO crea tickets ✅
    - NO crea transferencia ✅
    - Registra en webhook_logs (idempotencia)
    - Registra en audit_logs (auditoría)
```

---

## 📋 Mejoras Implementadas

### 1. Idempotencia en Webhooks
- **Problema anterior**: Si Mercado Pago enviaba el webhook 2 veces, se procesaba 2 veces
- **Solución**: Verificar en `webhook_logs` si el webhook ya se procesó antes de hacer nada
- **Beneficio**: Evita emails duplicados, tickets duplicados, transferencias duplicadas

### 2. Logs de Auditoría
- **Problema anterior**: No había forma de rastrear cambios de estado
- **Solución**: Registrar cada cambio en `audit_logs`
- **Beneficio**: Facilita debugging y soporte técnico

### 3. Transferencias Solo en Pagos Exitosos
- **Problema anterior**: Se creaban transferencias para pagos fallidos
- **Solución**: Crear transferencias solo cuando `payment_status === 'completed'` en el webhook
- **Beneficio**: Datos limpios, lógica clara

### 4. Verificación Automática de Estado
- **Problema anterior**: Compras rechazadas aparecían como "Pendiente" si no tenían `payment_provider_id`
- **Solución**: Verificar TODAS las compras pendientes con Mercado Pago (por `external_reference`)
- **Beneficio**: Estado siempre actualizado, incluso si el webhook tarda

---

## 🎯 Requisitos MVP

### Requisito 1: Ocultar Compras Rechazadas en `/mis-compras`

**Lo que el usuario quiere:**
- NO mostrar compras con `payment_status = 'failed'` en la lista
- Solo mostrar:
  - Compras con `payment_status = 'pending'` que REALMENTE estén pendientes (verificadas con Mercado Pago)
  - Compras con `payment_status = 'completed'` (con tickets y QR)

**Estado actual:**
- ✅ Ya se ocultan compras con `payment_status = 'failed'` (línea 569 en `mis-compras/page.tsx`)
- ✅ Ya se verifica automáticamente el estado con Mercado Pago
- ⚠️ **PROBLEMA**: Si una compra está `pending` pero fue rechazada, puede aparecer hasta que se verifique

**Solución propuesta:**
- Verificar el estado ANTES de mostrar la lista
- Si está `pending` pero Mercado Pago dice `rejected`, actualizar a `failed` inmediatamente
- Solo mostrar compras que realmente están `pending` o `completed`

**¿Es posible?** ✅ **SÍ, es posible y seguro**

---

### Requisito 2: Dashboard de Productora Basado en Estado de Mercado Pago

**Lo que el usuario quiere:**
- Mostrar transferencias/pagos basándose en lo que dice Mercado Pago, no nuestro estado interno
- Mostrar si Mercado Pago dice:
  - "realizado" → aparece
  - "pendiente" → aparece (solo si Mercado Pago realmente lo dice)
  - "completado" o "transferido" → aparece

**Estado actual:**
- El dashboard muestra transferencias basándose en nuestro estado interno (`transfer.status`)
- No consulta directamente el estado de Mercado Pago

**Solución propuesta:**
- Agregar campo `mp_status` en la tabla `transfers` o `purchases` que guarde el estado de Mercado Pago
- Actualizar este campo cuando llegue el webhook
- En el dashboard, mostrar basándose en `mp_status` en lugar de nuestro estado interno

**¿Es posible?** ✅ **SÍ, es posible y seguro**

---

## 🔧 Implementación Propuesta

### Cambio 1: Verificación Inmediata en `/mis-compras`

**Archivo:** `app/mis-compras/page.tsx`

**Cambio:**
- Verificar el estado de TODAS las compras `pending` ANTES de renderizar
- Si Mercado Pago dice `rejected` o `cancelled`, actualizar a `failed` inmediatamente
- Solo mostrar compras que realmente están `pending` o `completed`

**Riesgo:** Bajo - Solo mejora la verificación existente

---

### Cambio 2: Dashboard Basado en Estado de Mercado Pago

**Archivos:**
- `app/dashboard/page.tsx` (transferencias recientes)
- `app/dashboard/transferencias/page.tsx` (lista completa)
- `app/api/mercadopago/webhook/route.ts` (guardar `mp_status`)

**Cambios:**
1. Agregar campo `mp_status` en `purchases` (o usar `payment_provider_data->>'status'`)
2. Actualizar `mp_status` cuando llegue el webhook
3. En el dashboard, filtrar y mostrar basándose en `mp_status`

**Riesgo:** Bajo - Solo cambia la fuente de datos, no la lógica

---

## 📊 Mapeo de Estados

### Estados de Mercado Pago → Nuestros Estados

| Mercado Pago | Nuestro Estado | Mostrar en `/mis-compras` | Mostrar en Dashboard |
|--------------|----------------|---------------------------|----------------------|
| `approved` | `completed` | ✅ Sí (con tickets) | ✅ Sí |
| `rejected` | `failed` | ❌ No | ⚠️ Depende (ver abajo) |
| `cancelled` | `failed` | ❌ No | ⚠️ Depende (ver abajo) |
| `pending` | `pending` | ✅ Sí (si realmente está pendiente) | ✅ Sí |
| `refunded` | `refunded` | ✅ Sí (marcado como reembolsado) | ✅ Sí (marcado como cancelado) |
| `charged_back` | `refunded` | ✅ Sí (marcado como reembolsado) | ✅ Sí (marcado como cancelado) |

### Para Dashboard (Requisito 2)

El usuario quiere mostrar basándose en lo que dice Mercado Pago:

- **"realizado"** → No existe en MP, probablemente se refiere a `approved` → ✅ Mostrar
- **"pendiente"** → `pending` en MP → ✅ Mostrar (solo si MP realmente lo dice)
- **"completado"** → `approved` en MP → ✅ Mostrar
- **"transferido"** → No existe en MP, probablemente se refiere a cuando se procesa la transferencia → ✅ Mostrar cuando `transfer.status = 'completed'`

---

## ✅ Análisis de Requisitos MVP

### Requisito 1: Ocultar Compras Rechazadas en `/mis-compras`

**Lo que el usuario quiere:**
- NO mostrar compras rechazadas/fallidas en la lista
- Solo mostrar:
  - Compras `pending` que REALMENTE estén pendientes (verificadas con Mercado Pago)
  - Compras `completed` (con tickets y QR)

**Estado actual:**
- ✅ Ya se ocultan compras con `payment_status = 'failed'` (línea 569)
- ✅ Ya se verifica automáticamente el estado con Mercado Pago
- ⚠️ **PROBLEMA**: Si una compra está `pending` pero fue rechazada, puede aparecer hasta que se verifique (3-30 segundos)

**Solución propuesta:**
1. Verificar el estado ANTES de renderizar la lista
2. Si está `pending` pero Mercado Pago dice `rejected` o `cancelled`, actualizar a `failed` inmediatamente
3. Solo mostrar compras que realmente están `pending` (verificadas) o `completed`

**¿Es posible?** ✅ **SÍ, es posible y seguro**

**Implementación:**
- Usar `useEffect` para verificar todas las compras `pending` al cargar
- Si alguna está rechazada, actualizar inmediatamente
- El filtro existente ya oculta `failed`, así que funcionará automáticamente

**Riesgo:** Muy bajo - Solo mejora la verificación existente

---

### Requisito 2: Dashboard Basado en Estado de Mercado Pago

**Lo que el usuario quiere:**
- Mostrar transferencias/pagos basándose en lo que dice Mercado Pago, no nuestro estado interno
- Mostrar si Mercado Pago dice:
  - "realizado" → aparece (probablemente se refiere a `approved`)
  - "pendiente" → aparece (solo si Mercado Pago realmente lo dice)
  - "completado" o "transferido" → aparece

**Estado actual:**
- El dashboard muestra transferencias basándose en `transfer.status` (nuestro estado interno)
- El estado de Mercado Pago YA se guarda en `payment_provider_data->>'status'`
- No se usa este campo para filtrar/mostrar en el dashboard

**Solución propuesta:**
1. En el hook `useTransfers`, incluir `payment_provider_data` en el SELECT
2. Extraer `mp_status` de `payment_provider_data->>'status'`
3. En el dashboard, filtrar y mostrar basándose en `mp_status` en lugar de `payment_status`

**Mapeo de estados:**
- `approved` (MP) = "realizado/completado" → ✅ Mostrar
- `pending` (MP) = "pendiente" → ✅ Mostrar (solo si MP realmente lo dice)
- `rejected` (MP) = rechazado → ❌ NO mostrar (o mostrar como "Fallido")
- `cancelled` (MP) = cancelado → ❌ NO mostrar (o mostrar como "Cancelado")
- `refunded` (MP) = reembolsado → ✅ Mostrar (marcado como "Reembolsado")

**¿Es posible?** ✅ **SÍ, es posible y seguro**

**Implementación:**
- Modificar `useTransfers` para incluir `payment_provider_data` en el SELECT
- Agregar campo `mp_status` al tipo `Transfer`
- En el dashboard, usar `mp_status` para filtrar y mostrar
- Mantener `transfer.status` para lógica interna (cuándo transferir, etc.)

**Riesgo:** Bajo - Solo cambia la fuente de datos para mostrar, no la lógica interna

---

## ✅ Recomendación Final

### Requisito 1: ✅ IMPLEMENTAR AHORA
- Es posible y seguro
- Mejora la UX inmediatamente
- Ya tenemos la base (verificación automática)
- Bajo riesgo

### Requisito 2: ✅ IMPLEMENTAR AHORA
- Es posible y seguro
- Alinea el dashboard con la realidad de Mercado Pago
- Ya tenemos el dato (`payment_provider_data->>'status'`)
- Bajo riesgo

---

## 🚀 Plan de Implementación

### Paso 1: Mejorar `/mis-compras` (Requisito 1)
1. Agregar verificación inmediata al cargar la página
2. Verificar todas las compras `pending` con Mercado Pago
3. Si alguna está rechazada, actualizar a `failed` antes de renderizar
4. El filtro existente ya oculta `failed`, así que funcionará automáticamente

### Paso 2: Mejorar Dashboard (Requisito 2)
1. Modificar `useTransfers` para incluir `payment_provider_data`
2. Extraer `mp_status` de `payment_provider_data->>'status'`
3. Agregar `mp_status` al tipo `Transfer`
4. En el dashboard, usar `mp_status` para filtrar y mostrar
5. Mantener `transfer.status` para lógica interna

### Paso 3: Testing
1. Probar con pagos reales (exitosos y fallidos)
2. Verificar que las compras rechazadas NO aparecen en `/mis-compras`
3. Verificar que el dashboard muestra basándose en estado de Mercado Pago

---

## 📝 Notas Importantes

1. **Estado de Mercado Pago**: Ya se guarda en `payment_provider_data->>'status'`, no necesitamos agregar campo nuevo
2. **Lógica interna**: Mantener `payment_status` y `transfer.status` para lógica interna (cuándo transferir, etc.)
3. **Visualización**: Usar `mp_status` solo para mostrar en el dashboard, no para lógica
4. **Performance**: La verificación en `/mis-compras` puede hacer múltiples llamadas a la API, pero es necesario para UX
