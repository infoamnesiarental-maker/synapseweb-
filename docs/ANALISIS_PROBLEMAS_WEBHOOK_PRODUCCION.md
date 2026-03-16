# 🔍 Análisis Completo: Problemas de Webhook en Producción

## 📋 Contexto General del Proyecto

### Descripción del Sistema
**SynapseWeb** es una plataforma de gestión de eventos y venta de entradas desarrollada con:
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + Auth + Realtime)
- **Pagos**: Integración con Mercado Pago (Argentina)
- **Deployment**: Vercel (producción)
- **Base de Datos**: Supabase (PostgreSQL con Row Level Security)

### Flujo de Negocio Principal

1. **Productor crea evento** → Define fechas, precios, tipos de entrada
2. **Usuario compra entrada** → Selecciona tickets, completa checkout
3. **Sistema crea "preference" en Mercado Pago** → Genera link de pago
4. **Usuario paga en Mercado Pago** → Redirige a `/checkout/success`
5. **Mercado Pago envía webhook** → Notifica cambio de estado del pago
6. **Sistema procesa webhook** → Actualiza compra, crea tickets, envía email con QR

### Arquitectura del Webhook

```
Mercado Pago → POST /api/mercadopago/webhook
  ↓
1. Parsear payload (JSON body o query params)
2. Extraer payment_id (debe ser numérico, ej: "145137944075")
3. Validar que no sea UUID (nuestro purchase_id)
4. Consultar pago en Mercado Pago API
5. Obtener external_reference (nuestro purchase_id UUID)
6. Verificar idempotencia (webhook_logs)
7. Actualizar compra en Supabase
8. Si pago aprobado: crear tickets, enviar email con QR
```

---

## 🚨 Problemas Identificados en los Logs de Producción

### **PROBLEMA 1: Webhook recibe UUID en lugar de payment_id numérico**

**Logs:**
```
Mar 15 23:23:09.43 POST 500 /api/mercadopago/webhook
Error consultando pago en Mercado Pago: {
  "message":"Payment not found",
  "error":"not_found",
  "status":404,
  "cause":[{
    "code":2000,
    "description":"Payment not found",
    "data":"16-03-2026T02:23:10UTC;459633e8-1403-40fa-a3e8-b0f8ac02db4b"
  }]
}
```

**Análisis:**
- El UUID `459633e8-1403-40fa-a3e8-b0f8ac02db4b` es un `purchase_id` (nuestro ID interno)
- Mercado Pago **nunca** envía UUIDs, siempre envía `payment_id` numéricos (ej: "145137944075")
- El código intenta consultar Mercado Pago con este UUID → Error 404 "Payment not found"
- Esto sugiere que el webhook está recibiendo el `external_reference` (nuestro purchase_id) en lugar del `payment_id`

**Código relevante:**
```typescript
// app/api/mercadopago/webhook/route.ts líneas 85-158
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)

if (isUUID) {
  // Intenta buscar la compra en Supabase y obtener payment_provider_id
  const { data: purchase } = await supabase
    .from('purchases')
    .select('id, payment_provider_id, payment_status')
    .eq('id', paymentId)
    .maybeSingle()
  
  if (purchase && purchase.payment_provider_id) {
    paymentId = purchase.payment_provider_id.toString()
  } else {
    // Si no encuentra, intenta buscar en Mercado Pago por external_reference
    // Pero esto también falla porque el UUID no existe en MP
  }
}
```

**Hipótesis:**
1. **Mercado Pago está enviando el `external_reference` en lugar del `payment_id`** en el campo `data.id` del webhook
2. **El payload del webhook tiene una estructura diferente** a la esperada
3. **El código de parsing no está extrayendo correctamente** el `payment_id` del payload real de Mercado Pago

---

### **PROBLEMA 2: Error de Row Level Security (RLS) al insertar webhook_logs**

**Logs:**
```
Mar 15 23:23:09.33 POST 200 /api/mercadopago/webhook
⚠️ Error registrando webhook log (no crítico): {
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "webhook_logs"'
}
```

**Análisis:**
- Error código `42501` = Violación de política RLS
- El webhook no puede insertar registros en `webhook_logs`
- Esto **rompe la idempotencia** porque no puede registrar que el webhook ya fue procesado
- Resultado: Webhooks duplicados pueden procesarse múltiples veces

**Política RLS configurada:**
```sql
-- supabase/migrations/add_webhook_logs_and_audit_logs.sql líneas 73-77
CREATE POLICY "Webhook can insert logs"
  ON webhook_logs FOR INSERT
  WITH CHECK (true);
```

**Hipótesis:**
1. **La política RLS no se aplicó correctamente** en producción
2. **El cliente de Supabase del webhook no tiene permisos** (usa `createClient()` que requiere autenticación)
3. **Hay otra política RLS que está bloqueando** la inserción (conflicto de políticas)
4. **El cliente de Supabase necesita usar service role key** en lugar de anon key para el webhook

**Código relevante:**
```typescript
// app/api/mercadopago/webhook/route.ts
const supabase = await createClient() // ← Esto usa anon key, puede no tener permisos RLS
```

---

### **PROBLEMA 3: Múltiples llamadas simultáneas al webhook**

**Logs:**
```
Mar 15 23:23:09.43 POST 500 /api/mercadopago/webhook
Mar 15 23:23:09.33 POST 200 /api/mercadopago/webhook
Mar 15 23:23:09.32 POST 200 /api/mercadopago/webhook
```

**Análisis:**
- 3 llamadas POST al webhook en menos de 100ms
- Mercado Pago puede enviar múltiples notificaciones para el mismo pago
- Sin idempotencia funcional (debido al problema RLS), cada llamada procesa el pago
- Resultado: **Compras duplicadas, tickets duplicados, emails duplicados**

---

## 🔬 Hipótesis Principales

### **Hipótesis 1: Mercado Pago envía `external_reference` en lugar de `payment_id`**

**Evidencia:**
- Los logs muestran UUIDs siendo enviados al webhook
- El error de Mercado Pago incluye el UUID en el campo `data`
- El código tiene lógica para detectar UUIDs pero no está funcionando correctamente

**Posibles causas:**
1. Mercado Pago está enviando el webhook con una estructura diferente:
   ```json
   {
     "type": "payment",
     "data": {
       "id": "459633e8-1403-40fa-a3e8-b0f8ac02db4b" // ← UUID en lugar de número
     }
   }
   ```
2. El campo `external_reference` está siendo usado como `id` en el payload
3. Hay una configuración incorrecta en Mercado Pago que envía el `external_reference` como `payment_id`

**Solución propuesta:**
- Agregar logs más detallados del payload completo recibido
- Verificar la estructura real del webhook de Mercado Pago
- Si Mercado Pago envía `external_reference`, buscar el pago usando ese UUID en nuestra BD primero

---

### **Hipótesis 2: Cliente de Supabase sin permisos para insertar en webhook_logs**

**Evidencia:**
- Error RLS 42501 al intentar insertar
- La política RLS dice `WITH CHECK (true)` (debería permitir todo)
- El webhook usa `createClient()` que probablemente usa `anon` key

**Posibles causas:**
1. **El cliente de Supabase necesita service role key** para insertar sin autenticación:
   ```typescript
   // Actual (probablemente usa anon key)
   const supabase = await createClient()
   
   // Necesario para webhook (service role key)
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY! // ← Service role key
   )
   ```

2. **La política RLS requiere `auth.uid() IS NULL`** (webhook sin usuario):
   ```sql
   CREATE POLICY "Webhook can insert logs"
     ON webhook_logs FOR INSERT
     WITH CHECK (auth.uid() IS NULL); -- ← Permitir solo sin autenticación
   ```

3. **Hay un conflicto con otra política RLS** que está bloqueando

**Solución propuesta:**
- Usar service role key en el webhook
- Verificar que la política RLS permita inserts sin autenticación
- Agregar política específica para webhooks: `WITH CHECK (auth.uid() IS NULL)`

---

### **Hipótesis 3: El parsing del payload no está extrayendo correctamente el payment_id**

**Evidencia:**
- Los logs no muestran el payload completo recibido (solo preview de 200 caracteres)
- El código intenta múltiples formas de extraer `payment_id` pero puede estar fallando

**Código actual:**
```typescript
// Líneas 41-75 de route.ts
paymentId = data?.id?.toString() || body?.id?.toString() || body?.payment_id?.toString()

// Si no encuentra, intenta query params
paymentId = searchParams.get('data.id') || searchParams.get('id') || undefined
```

**Posibles causas:**
1. Mercado Pago envía el payload en un formato diferente:
   ```json
   {
     "action": "payment.updated",
     "api_version": "v1",
     "data": {
       "id": "145137944075" // ← Puede estar aquí
     },
     "date_created": "2026-03-15T23:23:09Z",
     "id": 123456789,
     "live_mode": true,
     "type": "payment",
     "user_id": "123456789"
   }
   ```

2. El campo puede estar anidado de otra forma:
   ```json
   {
     "type": "payment",
     "data": {
       "object": {
         "id": "145137944075" // ← Anidado más profundo
       }
     }
   }
   ```

**Solución propuesta:**
- Agregar logging completo del payload recibido (sin límite de caracteres)
- Verificar la documentación oficial de Mercado Pago sobre el formato del webhook
- Implementar parsing más robusto que maneje múltiples estructuras

---

## 🔧 Soluciones Propuestas

### **Solución 1: Mejorar parsing y logging del webhook**

```typescript
// Agregar logging completo
console.log('📥 [WEBHOOK RAW] Payload completo:', {
  bodyText: bodyText, // Sin límite
  url: request.url,
  headers: Object.fromEntries(request.headers.entries()),
  searchParams: Object.fromEntries(new URL(request.url).searchParams.entries())
})

// Parsing más robusto
let paymentId: string | undefined

// Intentar múltiples estructuras posibles
if (body?.data?.id) paymentId = body.data.id.toString()
else if (body?.data?.object?.id) paymentId = body.data.object.id.toString()
else if (body?.id) paymentId = body.id.toString()
else if (data?.id) paymentId = data.id.toString()
else if (searchParams.get('data.id')) paymentId = searchParams.get('data.id')!
else if (searchParams.get('id')) paymentId = searchParams.get('id')!
```

### **Solución 2: Usar service role key para webhook**

```typescript
// app/api/mercadopago/webhook/route.ts
import { createClient } from '@supabase/supabase-js'

// Crear cliente con service role key (bypass RLS)
const supabase = createClient(
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

### **Solución 3: Mejorar manejo de UUIDs**

```typescript
if (isUUID) {
  console.log('⚠️ UUID recibido, buscando compra en BD...')
  
  const { data: purchase, error } = await supabase
    .from('purchases')
    .select('id, payment_provider_id, payment_status')
    .eq('id', paymentId)
    .maybeSingle()
  
  if (purchase?.payment_provider_id) {
    console.log('✅ Compra encontrada, usando payment_provider_id:', purchase.payment_provider_id)
    paymentId = purchase.payment_provider_id.toString()
  } else {
    // Si no encontramos la compra, puede ser que Mercado Pago esté enviando
    // el external_reference directamente. Intentar buscar en MP.
    console.log('⚠️ Compra no encontrada, puede ser external_reference de MP')
    // Buscar en Mercado Pago por external_reference...
  }
}
```

### **Solución 4: Corregir política RLS**

```sql
-- Asegurar que el webhook puede insertar sin autenticación
DROP POLICY IF EXISTS "Webhook can insert logs" ON webhook_logs;
CREATE POLICY "Webhook can insert logs"
  ON webhook_logs FOR INSERT
  WITH CHECK (auth.uid() IS NULL OR true); -- Permitir sin auth o con auth
```

---

## 📊 Estado Actual del Código

### **Archivos Relevantes:**

1. **`app/api/mercadopago/webhook/route.ts`** (724 líneas)
   - Handler principal del webhook
   - Lógica de parsing, validación, idempotencia
   - Creación de tickets y envío de emails

2. **`supabase/migrations/add_webhook_logs_and_audit_logs.sql`**
   - Tabla `webhook_logs` con constraint UNIQUE en `payment_id`
   - Políticas RLS para webhook_logs

3. **`lib/supabase/server.ts`**
   - Función `createClient()` que probablemente usa anon key

### **Variables de Entorno Necesarias:**
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # ← Probablemente falta esta
MERCADOPAGO_ACCESS_TOKEN=...
RESEND_API_KEY=...
NEXT_PUBLIC_APP_URL=...
```

---

## 🎯 Próximos Pasos Recomendados

1. **Agregar logging completo del payload** para ver exactamente qué envía Mercado Pago
2. **Verificar y corregir RLS policies** en Supabase (usar service role key o ajustar políticas)
3. **Mejorar parsing del webhook** para manejar múltiples formatos posibles
4. **Implementar fallback robusto** cuando se recibe UUID: buscar en BD primero, luego en MP
5. **Agregar tests unitarios** para el parsing del webhook con diferentes formatos
6. **Documentar el formato exacto** del webhook que Mercado Pago envía en producción

---

## 📝 Notas Adicionales

- El sistema funciona correctamente en desarrollo local (localhost)
- El problema solo ocurre en producción (Vercel)
- Los pagos reales se están procesando pero los webhooks fallan
- Los usuarios no reciben emails con QR codes porque el webhook falla antes de crear tickets

---

**Fecha del análisis:** 15 de marzo de 2026  
**Ambiente:** Producción (Vercel)  
**URL:** https://synapseweb-sigma.vercel.app
