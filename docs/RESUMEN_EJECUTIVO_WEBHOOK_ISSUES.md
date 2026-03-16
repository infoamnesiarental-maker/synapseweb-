# 🚨 Resumen Ejecutivo: Problemas Críticos de Webhook en Producción

## Contexto Rápido

**Sistema:** Plataforma de venta de entradas con Next.js + Supabase + Mercado Pago  
**Problema:** Webhooks de Mercado Pago fallan en producción, impidiendo:
- Actualización de estado de pagos
- Creación de tickets
- Envío de emails con QR codes

---

## 🔴 Problemas Críticos Identificados

### 1. **Webhook recibe UUID en lugar de payment_id numérico**

**Error:**
```
POST 500 /api/mercadopago/webhook
Error: Payment not found (404)
Data: "459633e8-1403-40fa-a3e8-b0f8ac02db4b" ← UUID, no número
```

**Causa probable:** Mercado Pago está enviando `external_reference` (nuestro purchase_id UUID) en lugar del `payment_id` numérico en el campo `data.id` del webhook.

**Impacto:** El código intenta consultar Mercado Pago API con un UUID → Error 404 → Webhook falla completamente.

---

### 2. **Error RLS al insertar en webhook_logs**

**Error:**
```
⚠️ Error registrando webhook log: {
  code: '42501',
  message: 'new row violates row-level security policy for table "webhook_logs"'
}
```

**Causa probable:** El cliente de Supabase usa `anon` key que no tiene permisos para insertar sin autenticación, o la política RLS no permite inserts sin `auth.uid()`.

**Impacto:** No se puede registrar idempotencia → Webhooks duplicados procesan el mismo pago múltiples veces → Compras/tickets/emails duplicados.

---

### 3. **Múltiples llamadas simultáneas sin idempotencia**

**Observación:** 3 llamadas POST al webhook en <100ms  
**Impacto:** Sin idempotencia funcional, cada llamada procesa el pago → Duplicados.

---

## 💡 Hipótesis Principales

1. **Mercado Pago envía estructura diferente:** El `external_reference` (UUID) está en `data.id` en lugar del `payment_id` numérico
2. **Cliente Supabase sin permisos:** Necesita `service_role_key` para insertar en `webhook_logs` sin autenticación
3. **Parsing incompleto:** El código no está extrayendo correctamente el `payment_id` del payload real

---

## 🔧 Soluciones Propuestas

### Solución 1: Usar Service Role Key
```typescript
// En lugar de createClient() (anon key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← Service role
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

### Solución 2: Mejorar parsing del webhook
```typescript
// Agregar logging completo del payload
console.log('📥 [WEBHOOK] Payload completo:', JSON.stringify(body, null, 2))

// Parsing más robusto
let paymentId = body?.data?.id || body?.data?.object?.id || body?.id || data?.id
```

### Solución 3: Manejo robusto de UUIDs
```typescript
if (isUUID(paymentId)) {
  // 1. Buscar compra en BD por UUID
  const purchase = await supabase.from('purchases').select('payment_provider_id').eq('id', paymentId).single()
  if (purchase?.payment_provider_id) {
    paymentId = purchase.payment_provider_id.toString()
  } else {
    // 2. Buscar en Mercado Pago por external_reference
    const mpPayment = await searchMPByExternalReference(paymentId)
    if (mpPayment) paymentId = mpPayment.id.toString()
  }
}
```

### Solución 4: Corregir política RLS
```sql
-- Permitir inserts sin autenticación
CREATE POLICY "Webhook can insert logs"
  ON webhook_logs FOR INSERT
  WITH CHECK (auth.uid() IS NULL OR true);
```

---

## 📋 Archivos Relevantes

- `app/api/mercadopago/webhook/route.ts` - Handler principal (724 líneas)
- `supabase/migrations/add_webhook_logs_and_audit_logs.sql` - Políticas RLS
- `lib/supabase/server.ts` - Cliente de Supabase

---

## 🎯 Acción Inmediata Requerida

1. **Agregar logging completo** del payload recibido para ver estructura real
2. **Configurar service role key** en variables de entorno de Vercel
3. **Actualizar código** para usar service role key en webhook
4. **Verificar políticas RLS** en Supabase Dashboard
5. **Mejorar parsing** para manejar UUIDs y múltiples formatos

---

**Prioridad:** 🔴 CRÍTICA - Los pagos reales no se están procesando correctamente  
**Ambiente:** Producción (Vercel)  
**Fecha:** 15 de marzo de 2026
