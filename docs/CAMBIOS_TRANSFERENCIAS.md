# Cambios en la Lógica de Transferencias

## 📋 Resumen de Cambios

### Antes (Problema)
- ❌ Las transferencias se creaban **antes** de que el pago se complete
- ❌ Se creaban transferencias para pagos que podían fallar
- ❌ Aparecían transferencias "pendientes" para pagos que nunca se completaron
- ❌ Necesitaba sincronización compleja para corregir estados
- ❌ Confusión en el dashboard de productora

### Ahora (Solución)
- ✅ Las transferencias se crean **solo cuando el pago se complete** (en el webhook)
- ✅ No se crean transferencias para pagos fallidos
- ✅ Solo aparecen transferencias reales (pagos exitosos)
- ✅ No necesita sincronización (datos siempre correctos)
- ✅ Dashboard más claro y preciso

---

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
    
4b. Si pago fallido → Webhook:
    - Actualiza compra a 'failed'
    - NO crea tickets ✅
    - NO crea transferencia ✅
```

---

## 📝 Cambios Técnicos

### Archivos Modificados

#### 1. `lib/hooks/useCheckout.ts`
**Antes:**
- Creaba transferencia cuando se creaba la compra (líneas 117-143)

**Ahora:**
- Eliminada creación de transferencias
- Solo crea la compra con `payment_status = 'pending'`

#### 2. `app/api/mercadopago/webhook/route.ts`
**Antes:**
- Actualizaba estado de transferencias existentes
- Lógica compleja de sincronización

**Ahora:**
- Crea transferencia cuando `paymentStatus === 'completed'`
- Marca transferencia como `'cancelled'` cuando `paymentStatus === 'refunded'`
- Verifica idempotencia (no crea duplicados)

#### 3. `lib/hooks/useTransfers.ts`
**Antes:**
- Sincronizaba estados de transferencias con pagos
- Lógica compleja de corrección

**Ahora:**
- Eliminada sincronización
- Solo obtiene transferencias (ya están correctas)

#### 4. `app/api/admin/process-refund/route.ts`
**Antes:**
- Solo actualizaba estado de compra

**Ahora:**
- También marca transferencia como `'cancelled'` cuando hay reembolso

---

## 🗑️ Limpieza de Datos Antiguos

### Transferencias que Deben Eliminarse

Las transferencias creadas con el flujo anterior pueden estar en estados incorrectos:
- Transferencias con `status = 'pending'` pero `purchase.payment_status = 'failed'`
- Transferencias para compras que nunca se completaron

### Script SQL para Limpiar

Ver archivo: `LIMPIAR_TRANSFERENCIAS_ANTIGUAS.sql`

---

## ✅ Beneficios

1. **Lógica más clara**: Transferencia = Pago exitoso
2. **Datos más limpios**: No hay transferencias para pagos fallidos
3. **Menos complejidad**: No necesita sincronización
4. **UX mejorada**: Dashboard muestra solo transferencias reales
5. **Reembolsos**: Las transferencias reflejan correctamente si hubo reembolso

---

## 🔍 Verificación

Para verificar que todo funciona correctamente:

1. **Pago exitoso**: Debe crear transferencia automáticamente
2. **Pago fallido**: NO debe crear transferencia
3. **Reembolso**: Debe marcar transferencia como 'cancelled'
4. **Dashboard**: Solo debe mostrar transferencias de pagos exitosos
