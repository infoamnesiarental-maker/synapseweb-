# Guía de Testing: Webhook de Mercado Pago y Envío de QR por Email

Esta guía te ayudará a testear el flujo completo de webhooks de Mercado Pago y el envío de emails con códigos QR cuando se completan los pagos.

## 📋 Prerrequisitos

1. **Servidor local corriendo**: `npm run dev` en el puerto 3000
2. **Acceso a Supabase**: Para consultar la base de datos
3. **Compra de prueba**: Al menos una compra en tu base de datos (puede ser vieja)

---

## 🔍 Paso 1: Obtener datos de una compra real ✅

- [x] **Completado** - Obtener datos de compras reales

Primero necesitás obtener el `payment_provider_id` (ID de Mercado Pago) de una compra existente.

### Consulta SQL en Supabase:

```sql
SELECT 
  id, 
  payment_provider_id, 
  payment_status,
  guest_email,
  created_at
FROM purchases 
ORDER BY created_at DESC 
LIMIT 5;
```

**Anotá estos valores:**
- `id` → Este es tu `PURCHASE_ID`
- `payment_provider_id` → Este es tu `PAYMENT_ID` (ID de Mercado Pago)
- `payment_status` → Estado actual de la compra

### ✅ Datos obtenidos:
- **Compra 1:** ID=`a1a0fa57-293b-498a-9c2f-521c374641e8`, Payment ID=`145137944075`, Status=`completed` ⚠️ Ya tiene tickets (usada para testear idempotencia)
- **Compra 2:** ID=`75f9d43c-24ab-4eb5-99f6-db1f4eca8eae`, Payment ID=`145817923024`, Status=`completed`
- **Compra 3:** ID=`73c789f0-ed25-4505-9c71-55f78c4208db`, Payment ID=`145121638867`, Status=`completed`
- **Compra 4:** ID=`c2d43618-b8a2-4985-8ca4-0de2198b0a54`, Payment ID=`145801455236`, Status=`failed`
- **Compra 5:** ID=`d3f7a06f-9214-4b6c-9652-e6fcc7db012b`, Payment ID=`145110974107`, Status=`completed`

### 🔍 Verificar qué compras tienen tickets:

Ejecutá esta query en Supabase para ver qué compras tienen tickets:

```sql
SELECT 
  p.id as purchase_id,
  p.payment_provider_id,
  p.payment_status,
  COUNT(t.id) as tickets_count
FROM purchases p
LEFT JOIN tickets t ON t.purchase_id = p.id
WHERE p.payment_status = 'completed'
GROUP BY p.id, p.payment_provider_id, p.payment_status
ORDER BY p.created_at DESC
LIMIT 5;
```

**Busca una compra con `tickets_count = 0` para testear el envío de email.**

---

## 🧪 Paso 2: Testear Webhook - Pago Aprobado

- [x] **✅ Completado** - Ejecutar curl del webhook
- [x] **✅ Completado** - Verificar estado de compra en Supabase (compra actualizada a completed)
- [x] **✅ Completado** - Verificar tickets creados (1 ticket obtenido)
- [x] **✅ Completado** - Verificar webhook_logs (idempotencia funcionando - error de duplicate key es normal)
- [x] **✅ Completado** - Revisar logs en terminal (todos los logs correctos)
- [x] **✅ Completado** - Email enviado exitosamente (messageId: 706c1cc6-4669-44fa-8392-75990fb41460)

Este test simula que Mercado Pago notifica que un pago fue aprobado. Debe:
- ✅ Actualizar `payment_status` a `'completed'`
- ✅ Crear tickets con códigos QR
- ✅ Enviar email con los QR codes
- ✅ Registrar en `webhook_logs`

### Comando curl:

**Usá la Compra 1 (ya está en `completed`, perfecta para testear idempotencia):**

```bash
curl -X POST http://localhost:3000/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"145137944075"}}'
```

**O si querés testear con una compra diferente, usá:**
- Compra 2: `145817923024`
- Compra 3: `145121638867`
- Compra 5: `145110974107`

### Verificaciones en Supabase:

Después de ejecutar el curl, verificá en Supabase:

#### 1. Estado de la compra:
```sql
SELECT 
  id,
  payment_status,
  payment_provider_id,
  updated_at
FROM purchases 
WHERE payment_provider_id = 'TU_PAYMENT_ID_REAL';
```

**Resultado esperado:**
- `payment_status` = `'completed'`
- `updated_at` = Fecha/hora actual

#### 2. Tickets creados:
```sql
SELECT 
  id,
  ticket_number,
  qr_code,
  purchase_id
FROM tickets 
WHERE purchase_id = 'TU_PURCHASE_ID'
ORDER BY created_at DESC;
```

**Resultado esperado:**
- Debe haber tickets creados
- Cada ticket debe tener un `qr_code` único
- Cada ticket debe tener un `ticket_number` único

#### 3. Webhook log:
```sql
SELECT 
  id,
  payment_id,
  purchase_id,
  payment_status,
  processed_at
FROM webhook_logs 
WHERE payment_id = 'TU_PAYMENT_ID_REAL';
```

**Resultado esperado:**
- Debe haber **una sola fila** (idempotencia)
- `payment_status` = `'completed'`
- `processed_at` = Fecha/hora del procesamiento

#### 4. Logs en terminal:

En la terminal donde corre `npm run dev`, deberías ver:

```
📥 Webhook recibido de Mercado Pago: { type: 'payment', data: { id: '...' } }
✅ Compra [PURCHASE_ID] actualizada a estado: completed
💰 Gastos operativos: $...
💵 Margen neto: $...
📧 [WEBHOOK] Intentando enviar email para compra [PURCHASE_ID] a [email] usando endpoint: http://localhost:3000/api/send-tickets-email
📧 [SEND-EMAIL] Endpoint llamado - Iniciando procesamiento
📧 [SEND-EMAIL] Parámetros recibidos: { purchaseId: '...', email: '...', userName: '...' }
✅ [SEND-EMAIL] Compra obtenida: { purchaseId: '...', eventId: '...', guestEmail: '...' }
✅ [SEND-EMAIL] Tickets obtenidos: X ticket(s)
📧 [SEND-EMAIL] Inicializando Resend...
📧 [SEND-EMAIL] Enviando email a: [email]
✅ [SEND-EMAIL] Email enviado exitosamente - messageId: [id], duración: [X]ms
```

---

## 🔄 Paso 3: Testear Idempotencia

- [x] **✅ Completado** - Ejecutar curl dos veces
- [x] **✅ Completado** - Verificar que webhook_logs tiene solo 1 fila (total: 1)
- [x] **✅ Completado** - Verificar que no se duplicaron tickets
- [x] **✅ Completado** - Idempotencia funcionando correctamente (no envía emails duplicados)

Este test verifica que el sistema no procese el mismo webhook dos veces (no duplica tickets ni emails).

### Ejecutar el mismo curl DOS VECES:

```bash
# Primera llamada
curl -X POST http://localhost:3000/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"145137944075"}}'

# Segunda llamada (inmediatamente después - copiá y pegá el mismo comando)
curl -X POST http://localhost:3000/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"145137944075"}}'
```

### Verificaciones:

#### 1. Webhook logs (debe haber UNA sola fila):
```sql
SELECT COUNT(*) as total
FROM webhook_logs 
WHERE payment_id = 'TU_PAYMENT_ID_REAL';
```

**Resultado esperado:** `total = 1` (no 2)

#### 2. Tickets (no deben duplicarse):
```sql
SELECT COUNT(*) as total_tickets
FROM tickets 
WHERE purchase_id = 'TU_PURCHASE_ID';
```

**Resultado esperado:** El mismo número de tickets que antes (no duplicados)

#### 3. Logs en terminal:

En la segunda llamada deberías ver:

```
📥 Webhook recibido de Mercado Pago: { type: 'payment', data: { id: '...' } }
ℹ️ Webhook ya procesado para payment_id [PAYMENT_ID] (procesado el [fecha])
```

**NO deberías ver:**
- ❌ Logs de `[SEND-EMAIL]` (no se envía email duplicado)
- ❌ Logs de creación de tickets

---

## 🆕 Paso 4: Testear Envío de Email con Compra Nueva

Si todas las compras ya tienen tickets, necesitás hacer una compra nueva para testear el envío de email.

### ⚠️ IMPORTANTE: ¿Pago Real o de Prueba?

**Tu código actual solo permite tokens de PRODUCCIÓN** (que empiezan con `APP_USR-`). Esto significa:

- ✅ **Si usás token de PRODUCCIÓN**: Hacés pagos REALES (se cobra dinero de verdad)
- ❌ **NO podés usar sandbox** (token que empieza con `TEST-`) porque el código lo bloquea

### 🎯 Opciones para Testear SIN Hacer Pago Real:

**Opción 1: Usar Tarjetas de Prueba de Mercado Pago (Recomendado)**
- Hacé la compra desde la app normalmente
- Cuando Mercado Pago te pida la tarjeta, usá una tarjeta de PRUEBA:
  - **Tarjeta aprobada**: `5031 7557 3453 0604` (CVV: 123, Vencimiento: 11/25)
  - **Tarjeta rechazada**: `5031 4332 1540 6351` (CVV: 123, Vencimiento: 11/25)
- Mercado Pago procesará el pago como PRUEBA (no se cobra dinero real)
- El webhook llegará normalmente y enviará el email

**Opción 2: Usar una Compra Existente con `check-payment-status`**
- Usá una compra que ya existe pero que está en estado `pending`
- Ejecutá `check-payment-status` para verificar el estado
- Si el pago está aprobado, creará tickets y enviará email

### 📋 Instrucciones Simples (Opción 1 - Recomendada):

1. **Hacé una compra nueva desde la app:**
   - Abrí tu app en el navegador (`http://localhost:3000`)
   - Entrá a un evento publicado
   - Seleccioná tickets y completá el checkout
   - **Cuando Mercado Pago te pida la tarjeta, usá la tarjeta de PRUEBA:**
     - Número: `5031 7557 3453 0604`
     - CVV: `123`
     - Vencimiento: `11/25`
     - Nombre: Cualquiera
   - La compra se creará automáticamente

2. **Copiá el `purchase_id` de la compra:**
   - Podés verlo en la URL después del checkout
   - O consultá en Supabase:
   ```sql
   SELECT id, payment_status, guest_email
   FROM purchases 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

3. **Usá `check-payment-status` para verificar el pago:**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3000/api/mercadopago/check-payment-status" -Method POST -ContentType "application/json" -Body '{"purchaseId":"PEGÁ_ACÁ_EL_PURCHASE_ID"}' -UseBasicParsing
   ```
   
   Si el pago está aprobado en Mercado Pago, esto:
   - ✅ Actualizará el estado a `completed`
   - ✅ Creará los tickets
   - ✅ Enviará el email con QR codes

4. **Verificá los logs** en la terminal de `npm run dev`:
   - Debe mostrar que se crearon tickets
   - Debe mostrar que se envió el email

5. **Revisá tu email** (el que configuraste en `RESEND_TESTING_EMAIL`)

### ✅ Checklist:

- [ ] Hacer compra nueva desde la app
- [ ] Obtener el `purchase_id` de la compra
- [ ] Ejecutar `check-payment-status` con el `purchase_id`
- [ ] Verificar logs en terminal (debe crear tickets y enviar email)
- [ ] Revisar email recibido con QR codes

### ✅ Checklist:

- [ ] Ejecutar Paso 1 del script (ver eventos disponibles)
- [ ] Reemplazar valores en el INSERT (event_id, ticket_type_id, payment_provider_id, guest_email)
- [ ] Ejecutar el INSERT y obtener el purchase_id
- [ ] Verificar que tickets_count = 0
- [ ] Ejecutar curl con el nuevo payment_provider_id
- [ ] Verificar logs en terminal (debe crear tickets y enviar email)
- [ ] Verificar que se crearon tickets
- [ ] Verificar que se envió el email

### 📝 Ejemplo completo:

1. **Ejecutá el Paso 1 del script SQL** para obtener un evento:
   ```sql
   SELECT e.id, e.name, tt.id as ticket_type_id, tt.name, tt.price
   FROM events e
   INNER JOIN ticket_types tt ON tt.event_id = e.id
   WHERE e.status = 'published' AND tt.quantity_available > tt.quantity_sold
   LIMIT 1;
   ```

2. **Copiá los valores** (ejemplo):
   - `event_id`: `abc123...`
   - `ticket_type_id`: `def456...`
   - `price`: `1000.00`

3. **Ejecutá el INSERT** con estos valores (reemplazá en el script):
   - `event_id`: `'abc123...'`
   - `ticket_type_id`: `'def456...'`
   - `payment_provider_id`: `'145137944075'` (usá uno que ya tengas, o creá uno nuevo desde la app)
   - `guest_email`: `'tu-email@example.com'` (usá tu email de prueba)

4. **Verificá que no tiene tickets**:
   ```sql
   SELECT COUNT(*) as tickets_count
   FROM tickets
   WHERE purchase_id = 'TU_PURCHASE_ID';
   ```
   Debe retornar `0`.

5. **Ejecutá el webhook**:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3000/api/mercadopago/webhook" -Method POST -ContentType "application/json" -Body '{"type":"payment","data":{"id":"145137944075"}}' -UseBasicParsing
   ```

6. **Verificá los logs** en la terminal de `npm run dev`:
   - Debe crear tickets
   - Debe enviar email

7. **Verificá en Supabase**:
   ```sql
   SELECT COUNT(*) as tickets_count
   FROM tickets
   WHERE purchase_id = 'TU_PURCHASE_ID';
   ```
   Ahora debe retornar `1` (o la cantidad de tickets que configuraste).

---

## ⏸️ Paso 5: Testear Pago Pendiente (NO debe enviar email)

- [ ] **Pendiente** - Buscar compra pendiente
- [ ] **Pendiente** - Ejecutar check-payment-status
- [ ] **Pendiente** - Verificar que NO cambió a completed
- [ ] **Pendiente** - Verificar que NO se crearon tickets

Este test verifica que los pagos pendientes NO envíen emails ni creen tickets.

### Opción A: Usar check-payment-status con compra pendiente

Primero, obtené una compra que esté en estado `'pending'`:

```sql
SELECT 
  id,
  payment_provider_id,
  payment_status
FROM purchases 
WHERE payment_status = 'pending'
LIMIT 1;
```

**Nota:** De tus compras actuales, la Compra 4 está en `failed`, no `pending`. Si no tenés ninguna en `pending`, podés crear una nueva compra de prueba o saltar este paso.

Luego llamá al endpoint:

```bash
curl -X POST http://localhost:3000/api/mercadopago/check-payment-status \
  -H "Content-Type: application/json" \
  -d '{"purchaseId":"TU_PURCHASE_ID_PENDIENTE"}'
```

### Verificaciones:

#### 1. Estado NO cambió a completed:
```sql
SELECT payment_status
FROM purchases 
WHERE id = 'TU_PURCHASE_ID_PENDIENTE';
```

**Resultado esperado:** `payment_status` sigue siendo `'pending'` (no cambió)

#### 2. NO hay tickets creados:
```sql
SELECT COUNT(*) as total_tickets
FROM tickets 
WHERE purchase_id = 'TU_PURCHASE_ID_PENDIENTE';
```

**Resultado esperado:** `total_tickets = 0` (o el número que ya tenía antes)

#### 3. Logs en terminal:

**NO deberías ver:**
- ❌ Logs de `[SEND-EMAIL]`
- ❌ Logs de creación de tickets
- ❌ `payment_status = 'completed'`

**SÍ deberías ver:**
- ✅ Logs de verificación de estado
- ✅ `payment_status = 'pending'` (sin cambios)

---

## 🐛 Debug: Ver logs de email sin recibir el mail real

Si querés ver exactamente cuándo se llama al endpoint de email y con qué datos, podés agregar logs temporales.

### Modificar `app/api/send-tickets-email/route.ts`:

Agregá al principio del handler (después de la línea 27):

```typescript
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('📧 [SEND-EMAIL] Endpoint llamado - Iniciando procesamiento')
    
    const body: SendTicketsEmailParams = await request.json()
    const { purchaseId, email, userName } = body

    // 🔍 DEBUG: Log detallado (temporal para testing)
    console.log('🔍 [DEBUG] Email disparado para purchase:', purchaseId)
    console.log('🔍 [DEBUG] Email destino:', email ? `${email.substring(0, 3)}***` : 'null')
    console.log('🔍 [DEBUG] User name:', userName || 'null')
    
    // ⚠️ OPCIONAL: Si querés frenar el envío real para solo ver los logs:
    // return NextResponse.json({ ok: true, debug: true, message: 'Email bloqueado para testing' })
    
    // ... resto del código ...
```

**Nota:** Recordá eliminar estos logs después de testear.

---

## ✅ Checklist de Verificaciones

### Para Pago Aprobado (Paso 2):

- [ ] `purchases.payment_status` = `'completed'`
- [ ] Tickets creados en la tabla `tickets`
- [ ] Cada ticket tiene `qr_code` único
- [ ] Una fila en `webhook_logs` con `payment_status = 'completed'`
- [ ] Logs de `[SEND-EMAIL]` en terminal
- [ ] Email enviado (verificar en Resend Dashboard si está configurado)

### Para Idempotencia (Paso 3):

- [ ] Dos llamadas al webhook = **una sola fila** en `webhook_logs`
- [ ] No se duplicaron tickets
- [ ] No se envió email duplicado
- [ ] Log de "Webhook ya procesado" en la segunda llamada

### Para Pago Pendiente (Paso 4):

- [ ] `purchases.payment_status` **NO cambió** a `'completed'`
- [ ] **NO** se crearon tickets nuevos
- [ ] **NO** hay logs de `[SEND-EMAIL]` en terminal
- [ ] **NO** se envió email

---

## 🔧 Troubleshooting

### Problema: El webhook no actualiza el estado

**Verificar:**
1. ¿El `payment_provider_id` existe en Mercado Pago?
2. ¿El `MERCADOPAGO_ACCESS_TOKEN` está configurado?
3. Revisar logs de error en terminal

### Problema: No se envían emails

**Verificar:**
1. ¿El `RESEND_API_KEY` está configurado?
2. ¿El email está en la lista de emails verificados de Resend?
3. Revisar logs de `[SEND-EMAIL]` en terminal
4. Verificar que el endpoint `/api/send-tickets-email` esté accesible

### Problema: Se duplican tickets/emails

**Verificar:**
1. ¿Existe el constraint UNIQUE en `webhook_logs.payment_id`?
2. Revisar que la verificación de idempotencia funcione (línea 68-84 del webhook)

---

## 📊 Consultas SQL Útiles para Testing

### Ver todas las compras recientes:
```sql
SELECT 
  id,
  payment_provider_id,
  payment_status,
  guest_email,
  created_at,
  updated_at
FROM purchases 
ORDER BY created_at DESC 
LIMIT 10;
```

### Ver tickets de una compra específica:
```sql
SELECT 
  t.id,
  t.ticket_number,
  t.qr_code,
  tt.name as ticket_type_name,
  t.created_at
FROM tickets t
JOIN ticket_types tt ON t.ticket_type_id = tt.id
WHERE t.purchase_id = 'TU_PURCHASE_ID'
ORDER BY t.created_at DESC;
```

### Ver historial de webhooks:
```sql
SELECT 
  wl.id,
  wl.payment_id,
  wl.purchase_id,
  wl.payment_status,
  wl.processed_at,
  p.guest_email
FROM webhook_logs wl
JOIN purchases p ON wl.purchase_id = p.id
ORDER BY wl.processed_at DESC
LIMIT 20;
```

### Verificar idempotencia (buscar duplicados):
```sql
SELECT 
  payment_id,
  COUNT(*) as veces_procesado
FROM webhook_logs
GROUP BY payment_id
HAVING COUNT(*) > 1;
```

**Resultado esperado:** 0 filas (no debería haber duplicados)

---

## 🎯 Resumen de Endpoints

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/mercadopago/webhook` | POST | Recibe notificaciones de Mercado Pago |
| `/api/mercadopago/check-payment-status` | POST | Verifica estado de un pago manualmente |
| `/api/send-tickets-email` | POST | Envía email con QR codes (llamado internamente) |

---

## 📝 Notas Importantes

1. **En desarrollo**, Resend solo permite enviar emails a direcciones verificadas. Configurá `RESEND_TESTING_EMAIL` en tu `.env.local`.

2. **El webhook simulado** con curl funciona, pero en producción Mercado Pago envía el webhook automáticamente cuando cambia el estado del pago.

3. **Los logs** son tu mejor amigo. Siempre revisá la terminal donde corre `npm run dev` para ver qué está pasando.

4. **La idempotencia** es crítica. Si un webhook se procesa dos veces, no debe duplicar tickets ni emails.

---

## ✅ Estado del Sistema

Según la implementación actual:

- ✅ **Idempotencia implementada** (usando `webhook_logs` con UNIQUE constraint)
- ✅ **Envío de emails con QR** implementado
- ✅ **Creación de tickets** cuando el pago se completa
- ✅ **Logs detallados** para debugging
- ✅ **Validación de estados** (solo `completed` crea tickets y envía emails)

**¿Está bien realizado?** ✅ **Sí**, la implementación sigue buenas prácticas:
- Idempotencia con constraint UNIQUE
- Logs detallados para debugging
- Manejo de errores apropiado
- Separación de responsabilidades (webhook → email endpoint)
