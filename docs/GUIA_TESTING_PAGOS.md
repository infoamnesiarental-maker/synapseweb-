# 🧪 Guía de Testing - Sistema de Pagos MVP

**Fecha:** 2025-01-27  
**Versión:** MVP 1.1

---

## 📋 Checklist Pre-Testing

Antes de empezar, verifica que:

- [ ] La migración `supabase_add_payment_fields.sql` se ejecutó correctamente
- [ ] Tienes una productora creada y activa
- [ ] Tienes al menos un evento publicado con tickets

---

## 🔍 Paso 1: Verificar la Base de Datos

### 1.1 Verificar que los campos nuevos existen en `purchases`

En Supabase SQL Editor, ejecuta:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'purchases'
AND column_name IN ('event_id', 'base_amount', 'commission_amount', 'processing_costs')
ORDER BY column_name;
```

**Resultado esperado:** Deberías ver los 4 campos listados.

### 1.2 Verificar que la tabla `transfers` existe

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'transfers';
```

**Resultado esperado:** Debería retornar una fila con `transfers`.

### 1.3 Verificar políticas RLS de `transfers`

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'transfers';
```

**Resultado esperado:** Deberías ver al menos 2 políticas (una para SELECT de admins, otra para ALL de admins).

---

## 🎫 Paso 2: Preparar Datos de Prueba

### 2.1 Crear un Evento de Prueba

1. Inicia sesión como productora
2. Ve a `/dashboard/eventos/nuevo`
3. Crea un evento con:
   - Nombre: "Evento Test Pagos"
   - Fecha: Mañana (para que esté activo)
   - Categoría: Cualquiera
   - Publicar el evento

### 2.2 Agregar Tipos de Tickets

1. En el evento creado, agrega al menos 2 tipos de tickets:
   - **Ticket General**: Precio $10.000, Cantidad: 50
   - **Ticket VIP**: Precio $20.000, Cantidad: 20

**Nota:** Anota los precios porque los usaremos para verificar los cálculos.

---

## 💳 Paso 3: Probar el Checkout

### 3.1 Flujo de Compra (Usuario Registrado)

1. **Inicia sesión como usuario normal** (no productora)
2. **Ve al evento de prueba**: `/eventos/[slug-del-evento]`
3. **Selecciona un ticket**: Click en "Ticket General"
4. **Selecciona cantidad**: Prueba con 2 tickets
5. **Click en "Comprar Entradas"**

**Resultado esperado:**
- Deberías ser redirigido a `/checkout`
- Deberías ver:
  - Resumen de tickets seleccionados
  - Desglose de precios:
    - Subtotal: $20.000 (2 x $10.000)
    - Comisión Synapse (15%): $3.000
    - **Total: $23.000**

### 3.2 Completar el Checkout

1. **Completa el formulario:**
   - Si estás logueado: Solo nombre y teléfono (opcional)
   - Si no estás logueado: Email, nombre completo (requeridos)
2. **Click en "Confirmar Compra"**

**Resultado esperado:**
- Deberías ser redirigido a `/checkout/success`
- Deberías ver:
  - Mensaje de éxito
  - Número de compra
  - Lista de tickets generados
  - Total pagado: $23.000

### 3.3 Verificar en la Base de Datos

Ejecuta en Supabase SQL Editor:

```sql
-- Ver la compra creada
SELECT 
  id,
  user_id,
  event_id,
  total_amount,
  base_amount,
  commission_amount,
  processing_costs,
  payment_status,
  created_at
FROM purchases
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**
- `total_amount`: 23000
- `base_amount`: 20000
- `commission_amount`: 3000
- `payment_status`: 'completed'
- `event_id`: Debe coincidir con tu evento de prueba

### 3.4 Verificar Tickets Generados

```sql
-- Ver tickets generados
SELECT 
  t.id,
  t.ticket_number,
  t.qr_code,
  t.status,
  tt.name as ticket_type_name,
  tt.price
FROM tickets t
JOIN ticket_types tt ON t.ticket_type_id = tt.id
JOIN purchases p ON t.purchase_id = p.id
WHERE p.id = (
  SELECT id FROM purchases ORDER BY created_at DESC LIMIT 1
);
```

**Resultado esperado:**
- Deberías ver 2 tickets (uno por cada cantidad)
- `ticket_number`: Formato `EVT-XXXXXXXX-XXXXXX`
- `qr_code`: Formato `SYN-XXXXXXXX-XXXXXXXX`
- `status`: 'valid'

### 3.5 Verificar Transferencia Creada

```sql
-- Ver transferencia creada
SELECT 
  id,
  purchase_id,
  event_id,
  producer_id,
  amount,
  status,
  scheduled_at,
  created_at
FROM transfers
WHERE purchase_id = (
  SELECT id FROM purchases ORDER BY created_at DESC LIMIT 1
);
```

**Resultado esperado:**
- `amount`: 20000 (igual a base_amount)
- `status`: 'pending'
- `scheduled_at`: Debe ser 48 horas después de la fecha de fin del evento
- `producer_id`: Debe coincidir con tu productora

---

## 📊 Paso 4: Probar el Dashboard de Productora

### 4.1 Ver Estadísticas

1. **Inicia sesión como productora**
2. **Ve a `/dashboard`**

**Resultado esperado:**
- Deberías ver en las tarjetas:
  - **Facturación Total**: $20.000 (solo base_amount)
  - **Tickets Vendidos**: 2
  - **Pendientes de Transferir**: $20.000
  - **Eventos Activos**: 1 (si solo tienes ese evento publicado)

### 4.2 Ver Transferencias Recientes

En el dashboard, deberías ver una sección "Transferencias Recientes" con:
- Evento: "Evento Test Pagos"
- Monto: $20.000
- Estado: Pendiente
- Fecha de creación

---

## 🔄 Paso 5: Probar Múltiples Compras

### 5.1 Hacer Otra Compra

1. **Cierra sesión y vuelve a iniciar como otro usuario** (o como guest)
2. **Compra 1 ticket VIP** ($20.000)

**Cálculo esperado:**
- Subtotal: $20.000
- Comisión (15%): $3.000
- **Total: $23.000**

### 5.2 Verificar Totales en Dashboard

1. **Vuelve a iniciar sesión como productora**
2. **Ve a `/dashboard`**

**Resultado esperado:**
- **Facturación Total**: $40.000 (20.000 + 20.000)
- **Tickets Vendidos**: 3 (2 + 1)
- **Pendientes de Transferir**: $40.000

---

## 🧮 Paso 6: Verificar Cálculos de Precios

### 6.1 Fórmula de Cálculo

Para verificar que los cálculos son correctos:

```
Precio Base = Suma de (precio_ticket × cantidad)
Comisión = Precio Base × 0.15
Total = Precio Base + Comisión
```

### 6.2 Ejemplo de Verificación

Si compras 2 tickets de $10.000:

```
Precio Base = 2 × 10.000 = 20.000
Comisión = 20.000 × 0.15 = 3.000
Total = 20.000 + 3.000 = 23.000
```

Verifica que estos números coincidan en:
- La página de checkout
- La tabla `purchases` en Supabase
- La página de éxito

---

## 🐛 Problemas Comunes y Soluciones

### Problema: "No hay entradas disponibles"

**Causa:** El ticket type no tiene `quantity_available` o está agotado.

**Solución:**
```sql
-- Verificar disponibilidad
SELECT 
  name,
  quantity_available,
  quantity_sold,
  (quantity_available - quantity_sold) as disponibles
FROM ticket_types
WHERE event_id = 'TU_EVENT_ID';
```

### Problema: "Error creando compra"

**Causa:** Puede ser un problema de RLS o datos faltantes.

**Solución:**
1. Verifica que el evento esté publicado
2. Verifica que tengas los permisos correctos
3. Revisa la consola del navegador para ver el error específico

### Problema: "No se creó la transferencia"

**Causa:** Error al obtener el `producer_id` del evento.

**Solución:**
```sql
-- Verificar que el evento tiene producer_id
SELECT id, name, producer_id
FROM events
WHERE id = 'TU_EVENT_ID';
```

### Problema: "Los cálculos no coinciden"

**Causa:** Puede ser un problema de redondeo o cálculo incorrecto.

**Solución:**
1. Verifica la función `calculatePrice` en `lib/utils/pricing.ts`
2. Verifica que los números en la BD sean correctos
3. Compara con una calculadora manual

---

## ✅ Checklist Final de Testing

- [ ] Migración SQL ejecutada correctamente
- [ ] Evento creado y publicado
- [ ] Tickets agregados al evento
- [ ] Checkout funciona (usuario registrado)
- [ ] Checkout funciona (guest)
- [ ] Cálculos de precios correctos
- [ ] Compra se crea en `purchases`
- [ ] Tickets se generan correctamente
- [ ] Transferencia se crea con status 'pending'
- [ ] Dashboard muestra estadísticas correctas
- [ ] Múltiples compras funcionan
- [ ] Totales se suman correctamente

---

## 📝 Notas Importantes

1. **En MVP, el pago se marca como 'completed' automáticamente** (simulado)
2. **Las transferencias se crean con status 'pending'** y se programan para 48hs post-evento
3. **Los QR codes se generan automáticamente** pero no se validan aún
4. **No hay integración real con Mercado Pago** todavía (solo simulado)

---

## 🚀 Próximos Pasos (Fuera del MVP)

- [ ] Integrar Mercado Pago real
- [ ] Webhooks para recibir notificaciones de pago
- [ ] Generar PDFs de tickets
- [ ] Enviar emails con tickets
- [ ] Validación de QR codes
- [ ] Procesamiento automático de transferencias

---

**¿Encontraste algún problema?** Revisa la consola del navegador y los logs de Supabase para más detalles.
