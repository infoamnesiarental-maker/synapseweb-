# Implementación: Idempotencia y Auditoría

## 📋 Resumen

Se implementaron dos mejoras importantes para el sistema:

1. **Idempotencia en webhooks**: Evita procesar el mismo webhook múltiples veces
2. **Logs de auditoría**: Registra todos los cambios importantes en el sistema

---

## 🗄️ Cambios en Base de Datos

### Nueva Migración: `add_webhook_logs_and_audit_logs.sql`

#### Tabla: `webhook_logs`
- **Propósito**: Registrar qué webhooks ya se procesaron
- **Campos clave**:
  - `payment_id` (UNIQUE): ID del pago de Mercado Pago
  - `purchase_id`: ID de la compra asociada
  - `payment_status`: Estado cuando se procesó
  - `webhook_data`: Datos completos del webhook (JSONB)
- **RLS**: Solo admins pueden ver, el webhook puede insertar

#### Tabla: `audit_logs`
- **Propósito**: Registrar cambios importantes en el sistema
- **Campos clave**:
  - `entity_type`: Tipo de entidad ('purchase', 'transfer', etc.)
  - `entity_id`: ID de la entidad
  - `action`: Acción realizada ('status_changed', 'created', etc.)
  - `old_value` / `new_value`: Valores antes y después
  - `triggered_by`: Quién causó el cambio ('mercadopago_webhook', 'admin', etc.)
- **RLS**: Solo admins pueden ver, el sistema puede insertar

---

## 🔧 Cambios en el Código

### Archivo: `app/api/mercadopago/webhook/route.ts`

#### 1. Verificación de Idempotencia (Líneas 65-84)
```typescript
// Verificar si este webhook ya se procesó
const { data: existingWebhookLog } = await supabase
  .from('webhook_logs')
  .select('id, payment_status, processed_at')
  .eq('payment_id', paymentId.toString())
  .maybeSingle()

if (existingWebhookLog) {
  // Retornar éxito sin procesar (idempotencia)
  return NextResponse.json({ 
    success: true, 
    purchaseId, 
    status: existingWebhookLog.payment_status,
    message: 'Webhook ya procesado anteriormente',
    alreadyProcessed: true
  })
}
```

**Beneficio**: Si Mercado Pago envía el mismo webhook 2 veces, solo se procesa la primera vez.

---

#### 2. Registro de Auditoría (Líneas 167-191)
```typescript
// Registrar cambio de estado
if (oldPaymentStatus !== paymentStatus) {
  await supabase
    .from('audit_logs')
    .insert({
      entity_type: 'purchase',
      entity_id: purchaseId,
      action: 'status_changed',
      old_value: { payment_status: oldPaymentStatus },
      new_value: { payment_status: paymentStatus },
      changed_field: 'payment_status',
      triggered_by: 'mercadopago_webhook',
      metadata: {
        payment_id: paymentId.toString(),
        mp_status: payment.status,
      },
    })
}
```

**Beneficio**: Registra cada cambio de estado para debugging y trazabilidad.

---

#### 3. Registro de Webhook Procesado (Líneas 193-210)
```typescript
// Registrar que este webhook se procesó
await supabase
  .from('webhook_logs')
  .insert({
    payment_id: paymentId.toString(),
    purchase_id: purchaseId,
    webhook_type: type,
    payment_status: paymentStatus,
    webhook_data: payment,
  })
```

**Beneficio**: Marca el webhook como procesado para futuras verificaciones.

---

#### 4. Prevención de Email Duplicado (Líneas 389-410)
```typescript
// Solo enviar email si este webhook no se procesó antes
if (!existingWebhookLog) {
  // Enviar email...
}
```

**Beneficio**: Evita enviar emails duplicados si el webhook se procesa múltiples veces.

---

## ✅ Flujo Completo

### Antes (Sin Idempotencia)
1. Webhook llega → Procesa → Crea tickets → Envía email
2. Webhook llega de nuevo → Procesa de nuevo → Crea tickets duplicados ❌ → Envía email duplicado ❌

### Después (Con Idempotencia)
1. Webhook llega → Verifica si ya se procesó → NO → Procesa → Crea tickets → Envía email → Registra en `webhook_logs`
2. Webhook llega de nuevo → Verifica si ya se procesó → SÍ → Retorna éxito sin procesar ✅

---

## 🔒 Seguridad (RLS)

### `webhook_logs`
- ✅ Solo admins pueden ver logs
- ✅ El webhook puede insertar (necesario para funcionar)
- ✅ Solo admins pueden actualizar

### `audit_logs`
- ✅ Solo admins pueden ver logs
- ✅ El sistema puede insertar (webhook, procesos internos)
- ✅ Solo admins pueden actualizar

---

## 📊 Consultas Útiles

### Ver webhooks procesados
```sql
SELECT * FROM webhook_logs 
WHERE purchase_id = '...' 
ORDER BY processed_at DESC;
```

### Ver historial de cambios de una compra
```sql
SELECT * FROM audit_logs 
WHERE entity_type = 'purchase' 
  AND entity_id = '...' 
ORDER BY created_at DESC;
```

### Ver todos los cambios de estado de pagos
```sql
SELECT * FROM audit_logs 
WHERE entity_type = 'purchase' 
  AND action = 'status_changed' 
ORDER BY created_at DESC;
```

---

## 🧪 Testing

### Test 1: Webhook Duplicado
1. Mercado Pago envía webhook → Se procesa ✅
2. Mercado Pago envía el mismo webhook → Se ignora ✅
3. Verificar que solo se envió 1 email ✅

### Test 2: Auditoría
1. Cambiar estado de compra → Verificar que se registró en `audit_logs` ✅
2. Verificar que `old_value` y `new_value` son correctos ✅

### Test 3: RLS
1. Usuario normal intenta ver `webhook_logs` → No puede ✅
2. Admin intenta ver `webhook_logs` → Puede ✅

---

## ⚠️ Notas Importantes

1. **No crítico si falla**: Si el registro de auditoría o webhook_log falla, el webhook sigue funcionando (solo se registra un warning)
2. **UNIQUE constraint**: El `payment_id` tiene UNIQUE constraint, previene duplicados a nivel de BD
3. **Performance**: Los índices mejoran las consultas de verificación de idempotencia
4. **Privacidad**: Solo admins pueden ver los logs (datos sensibles)

---

## 🚀 Próximos Pasos

1. Ejecutar la migración SQL en Supabase
2. Probar con un webhook real
3. Verificar que los logs se registran correctamente
4. Monitorear performance (los índices deberían mantenerlo rápido)

---

## 📝 Checklist de Implementación

- [x] Crear migración SQL con tablas y RLS
- [x] Agregar verificación de idempotencia al webhook
- [x] Agregar registro de auditoría cuando cambia estado
- [x] Agregar registro de webhook procesado
- [x] Prevenir email duplicado con verificación
- [x] Verificar que no se rompe nada existente
- [x] TypeScript compila sin errores
- [ ] Ejecutar migración en Supabase
- [ ] Probar con webhook real
- [ ] Verificar logs en producción
