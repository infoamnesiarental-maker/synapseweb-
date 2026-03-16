# 🔴 Análisis de Regresión: Webhook Funcionaba Antes, Ahora Falla

## 📊 Situación Anterior vs Actual

### ✅ **ANTES (Funcionaba)**
- Webhook recibía pagos correctamente
- Actualizaba `purchases` con `payment_status = 'completed'`
- Creaba tickets en la base de datos
- **PROBLEMA ÚNICO**: No enviaba emails con QR codes

### ❌ **AHORA (Roto)**
- Webhook falla con error 500 "Payment not found"
- No actualiza compras
- No crea tickets
- No envía emails
- Error RLS al insertar en `webhook_logs`

---

## 🔍 ¿Qué Cambió que Rompió el Sistema?

### **Cambio 1: Lógica de Detección de UUIDs (Líneas 85-158)**

**Problema:** Se agregó lógica para detectar si el `paymentId` es un UUID y buscar el `payment_provider_id` en la BD. Esta lógica está fallando porque:

1. **Mercado Pago está enviando UUIDs** (external_reference) en lugar de payment_id numérico
2. **La búsqueda en BD falla** porque el cliente de Supabase no tiene permisos (RLS)
3. **La búsqueda en Mercado Pago API falla** porque busca por external_reference pero el UUID no existe en MP como payment_id

**Código problemático:**
```typescript
// Líneas 90-157
if (isUUID) {
  // Intenta buscar compra en BD
  const { data: purchase } = await supabase
    .from('purchases')
    .select('payment_provider_id')
    .eq('id', paymentId)
    .maybeSingle()
  
  if (purchase?.payment_provider_id) {
    paymentId = purchase.payment_provider_id.toString()
  } else {
    // Intenta buscar en MP por external_reference
    // PERO ESTO FALLA porque MP no tiene ese UUID como payment_id
    const searchResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${paymentId}...`
    )
    // Si no encuentra, retorna error 200 (pero el webhook ya falló)
  }
}
```

**Resultado:** El webhook retorna 200 con error, pero nunca procesa el pago.

---

### **Cambio 2: Verificación de Idempotencia con webhook_logs (Líneas 220-239)**

**Problema:** Se agregó verificación de idempotencia consultando `webhook_logs`, pero:

1. **El cliente de Supabase no puede leer** `webhook_logs` (RLS bloquea)
2. **El cliente de Supabase no puede insertar** `webhook_logs` (RLS bloquea)
3. **Resultado:** La idempotencia no funciona, y además bloquea el flujo normal

**Código problemático:**
```typescript
// Líneas 220-239
const { data: existingWebhookLog } = await supabase
  .from('webhook_logs')
  .select('id, payment_status, processed_at')
  .eq('payment_id', finalPaymentId)
  .maybeSingle()

if (existingWebhookLog) {
  // Retorna sin procesar
  return NextResponse.json({ ... })
}
```

**Resultado:** Si el cliente no puede leer (RLS), esta verificación puede fallar silenciosamente o bloquear el flujo.

---

### **Cambio 3: Cliente de Supabase sin Service Role Key**

**Problema:** El webhook usa `createClient()` que usa `anon` key:

```typescript
// lib/supabase/server.ts
export async function createClient() {
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey, // ← ANON KEY, no tiene permisos para webhook_logs
    { cookies: ... }
  )
}
```

**Resultado:**
- No puede insertar en `webhook_logs` (RLS bloquea)
- No puede leer `webhook_logs` para verificar idempotencia
- Puede tener problemas para leer/actualizar `purchases` si las políticas RLS no están bien configuradas

---

## 🎯 Solución: Volver al Flujo Anterior + Agregar Envío de Emails

### **Estrategia:**

1. **Simplificar el parsing del webhook** - Remover lógica compleja de UUIDs
2. **Usar service role key** para el webhook (bypass RLS)
3. **Mantener idempotencia simple** - Verificar si ya se procesó consultando `purchases.payment_status`
4. **Agregar envío de emails** que faltaba antes

---

## 🔧 Cambios Necesarios

### **1. Crear cliente de Supabase con service role key para webhook**

```typescript
// app/api/mercadopago/webhook/route.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cliente con service role key (bypass RLS)
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← Service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### **2. Simplificar parsing - Remover lógica de UUIDs**

```typescript
// ANTES (complejo, falla)
if (isUUID) {
  // Buscar en BD, buscar en MP, etc...
}

// AHORA (simple, funciona)
// Si es UUID, buscar directamente en purchases por ID
// Si no es UUID, usar directamente como payment_id
```

### **3. Idempotencia simple - Verificar en purchases**

```typescript
// En lugar de verificar webhook_logs (que falla por RLS)
// Verificar directamente en purchases si ya se procesó
const { data: purchase } = await supabase
  .from('purchases')
  .select('id, payment_status, payment_provider_id')
  .eq('payment_provider_id', paymentId)
  .maybeSingle()

if (purchase?.payment_status === 'completed') {
  // Ya se procesó, retornar sin hacer nada
  return NextResponse.json({ success: true, alreadyProcessed: true })
}
```

### **4. Agregar envío de emails (lo que faltaba antes)**

```typescript
// Después de crear tickets, enviar email
if (paymentStatus === 'completed' && !existingTickets?.length) {
  // Crear tickets...
  
  // Enviar email con QR
  const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-tickets-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchaseId })
  })
}
```

---

## 📋 Checklist de Reversión

- [ ] Crear función para cliente de Supabase con service role key
- [ ] Simplificar parsing del webhook (remover lógica de UUIDs compleja)
- [ ] Cambiar idempotencia de `webhook_logs` a verificación en `purchases`
- [ ] Agregar envío de emails después de crear tickets
- [ ] Probar que los pagos se actualicen correctamente
- [ ] Probar que los emails se envíen correctamente
- [ ] Verificar que no haya duplicados

---

## 🚨 Problema Raíz

**El problema no es la lógica de UUIDs o RLS en sí, sino que:**

1. **Se agregó complejidad innecesaria** cuando el flujo anterior funcionaba
2. **Se cambió el cliente de Supabase** sin considerar permisos RLS
3. **Se agregó dependencia de `webhook_logs`** que requiere permisos especiales
4. **No se probó en producción** antes de desplegar

**La solución es volver a lo simple que funcionaba, y solo agregar lo que faltaba: el envío de emails.**

---

**Fecha:** 15 de marzo de 2026  
**Prioridad:** 🔴 CRÍTICA - Sistema completamente roto en producción
