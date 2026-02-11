# Guía de Testing: Envío de Emails (Versión Mejorada con Logs)

## 🎯 Objetivo

Verificar que el sistema de envío de emails funciona correctamente después de las mejoras de logging y manejo de errores.

## 📋 Preparación

### 1. Abrir herramientas de monitoreo

Abrí **3 pestañas**:
- **Pestaña 1**: Tu app en producción (`/eventos`)
- **Pestaña 2**: **Vercel Logs** (https://vercel.com/dashboard → tu proyecto → Logs)
- **Pestaña 3**: Tu email (donde debería llegar el ticket)

### 2. Verificar configuración

Antes de empezar, verificá que estas variables estén configuradas en Vercel:
- `NEXT_PUBLIC_APP_URL` = `https://synapseweb-sigma.vercel.app` (o tu dominio)
- `RESEND_API_KEY` = Tu API key de Resend
- `RESEND_TESTING_EMAIL` = Email para testing (opcional, solo desarrollo)

## 🧪 Test: Compra Exitosa

### Paso 1: Realizar Compra

1. En la app, andá a `/eventos`
2. Elegí un evento de prueba (precio bajo, ej: $10)
3. Agregá **1 ticket** al carrito
4. Completá el checkout con:
   - **Email real** donde querés recibir el ticket
   - Datos válidos
5. Pagá con Mercado Pago (tarjeta válida)
6. Completá el pago exitosamente
7. Esperá a que te redirija a `/checkout/success`

### Paso 2: Verificar Logs en Vercel (INMEDIATAMENTE)

Buscá en los logs estas líneas en orden cronológico (de más reciente a más antiguo):

#### ✅ Logs Esperados del Webhook:

```
📧 [WEBHOOK] Intentando enviar email para compra [ID] a [email] usando endpoint: https://synapseweb-sigma.vercel.app/api/send-tickets-email
```

#### ✅ Logs Esperados del Endpoint de Email (NUEVOS):

```
📧 [SEND-EMAIL] Endpoint llamado - Iniciando procesamiento
📧 [SEND-EMAIL] Parámetros recibidos: { purchaseId: '...', email: '...', userName: '...' }
📧 [SEND-EMAIL] Obteniendo compra desde Supabase...
✅ [SEND-EMAIL] Compra obtenida: { purchaseId: '...', eventId: '...', guestEmail: '...' }
📧 [SEND-EMAIL] Obteniendo tickets desde Supabase...
✅ [SEND-EMAIL] Tickets obtenidos: 1 ticket(s)
📧 [SEND-EMAIL] Inicializando Resend...
📧 [SEND-EMAIL] Enviando email a: [email]
✅ [SEND-EMAIL] Email enviado exitosamente - messageId: [id], duración: [X]ms
```

#### ✅ Logs Esperados del Webhook (Respuesta):

```
✅ [WEBHOOK] Email de tickets enviado exitosamente para compra [ID]: { success: true, messageId: '...', duration: '...ms' }
```

### Paso 3: Verificar Errores (Si los hay)

Si algo falla, buscá estos logs:

#### ❌ Si el endpoint NO se llama:

**No verás ningún log de `[SEND-EMAIL]`**

Posibles causas:
- Timeout del fetch (30 segundos)
- Error de red
- URL incorrecta

**Logs esperados:**
```
❌ [WEBHOOK] Timeout enviando email (30s) para compra [ID]
```
o
```
❌ [WEBHOOK] Error de red/enviando email para compra [ID]: { error: '...', name: '...' }
```

#### ❌ Si el endpoint se llama pero falla:

**Verás logs de `[SEND-EMAIL]` pero terminará en error**

**Ejemplo 1: Compra no encontrada**
```
📧 [SEND-EMAIL] Endpoint llamado - Iniciando procesamiento
📧 [SEND-EMAIL] Parámetros recibidos: ...
📧 [SEND-EMAIL] Obteniendo compra desde Supabase...
❌ [SEND-EMAIL] Error obteniendo compra: { code: 'PGRST116', ... }
```

**Ejemplo 2: Tickets no encontrados**
```
📧 [SEND-EMAIL] Endpoint llamado - Iniciando procesamiento
...
✅ [SEND-EMAIL] Compra obtenida: ...
📧 [SEND-EMAIL] Obteniendo tickets desde Supabase...
❌ [SEND-EMAIL] Error obteniendo tickets: ...
```

**Ejemplo 3: Error con Resend**
```
📧 [SEND-EMAIL] Endpoint llamado - Iniciando procesamiento
...
✅ [SEND-EMAIL] Tickets obtenidos: 1 ticket(s)
📧 [SEND-EMAIL] Inicializando Resend...
📧 [SEND-EMAIL] Enviando email a: ...
❌ [SEND-EMAIL] Error enviando email con Resend: ...
```

### Paso 4: Verificar en tu Email (1-2 minutos)

1. Revisá la **bandeja de entrada** del email que usaste
2. Buscá un email con asunto: `Tus Entradas - [Nombre del Evento]`
3. Si estás en desarrollo/testing, puede tener `[TESTING]` en el asunto

### Paso 5: Verificar Contenido del Email

El email debe incluir:
- [ ] Header con "SYNAPSE" y "Tus Entradas"
- [ ] Mensaje "¡Compra Exitosa!"
- [ ] Nombre del evento
- [ ] Fecha y hora del evento
- [ ] Lugar del evento (venue_name)
- [ ] Total pagado
- [ ] **QR code(s) visible(s)** (imagen generada por qrserver.com)
- [ ] Número de ticket(s)
- [ ] Tipo de ticket (ej: "Vip 1")

### Paso 6: Verificar en `/mis-compras`

1. Andá a `/mis-compras` (con el usuario que hizo la compra)
2. Deberías ver:
   - [ ] La compra aparece con estado "Completado" (verde)
   - [ ] Muestra el nombre del evento
   - [ ] Muestra el total pagado
   - [ ] Al expandir, muestra los tickets con QR codes
   - [ ] Los QR codes son escaneables

---

## 📊 Datos que Necesito para Revisar el Test

Después de hacer el test, compartime:

### 1. Logs del Webhook (de Vercel)

Buscá y copiame:
- Todos los logs que contengan `[WEBHOOK]` relacionados con el email
- Especialmente:
  - `📧 [WEBHOOK] Intentando enviar email...`
  - `✅ [WEBHOOK] Email de tickets enviado exitosamente...`
  - O `❌ [WEBHOOK] Error...`

### 2. Logs del Endpoint de Email (de Vercel)

Buscá y copiame:
- Todos los logs que contengan `[SEND-EMAIL]`
- Especialmente:
  - `📧 [SEND-EMAIL] Endpoint llamado...`
  - `✅ [SEND-EMAIL] Email enviado exitosamente...`
  - O cualquier `❌ [SEND-EMAIL] Error...`

### 3. Logs de HTTP Requests (de Vercel)

Buscá y copiame:
- `POST /api/send-tickets-email` (con su status code: 200, 404, 500, etc.)

### 4. Resultado del Test

Contame:
- [ ] ¿Llegó el email? (Sí/No)
- [ ] ¿El email tiene QR code? (Sí/No)
- [ ] ¿Aparece en `/mis-compras`? (Sí/No)
- [ ] ¿Hay algún error visible en los logs? (Sí/No - si sí, cuál)

### 5. ID de la Compra (opcional, pero útil)

Si podés, compartime el `purchaseId` de la compra de prueba para verificar en Supabase.

---

## 🔍 Qué Buscar en los Logs

### Escenario 1: TODO Funciona ✅

**Logs esperados:**
```
📧 [WEBHOOK] Intentando enviar email...
📧 [SEND-EMAIL] Endpoint llamado...
📧 [SEND-EMAIL] Parámetros recibidos...
✅ [SEND-EMAIL] Compra obtenida...
✅ [SEND-EMAIL] Tickets obtenidos...
✅ [SEND-EMAIL] Email enviado exitosamente...
✅ [WEBHOOK] Email de tickets enviado exitosamente...
POST 200 /api/send-tickets-email
```

**Resultado:** Email debería llegar correctamente.

### Escenario 2: Timeout ⏱️

**Logs esperados:**
```
📧 [WEBHOOK] Intentando enviar email...
❌ [WEBHOOK] Timeout enviando email (30s) para compra [ID]
```

**Resultado:** El endpoint no respondió en 30 segundos. Puede ser un problema de rendimiento o de red.

### Escenario 3: Error de RLS 🔒

**Logs esperados:**
```
📧 [WEBHOOK] Intentando enviar email...
📧 [SEND-EMAIL] Endpoint llamado...
📧 [SEND-EMAIL] Parámetros recibidos...
📧 [SEND-EMAIL] Obteniendo compra desde Supabase...
❌ [SEND-EMAIL] Error obteniendo compra: { code: 'PGRST116', ... }
POST 404 /api/send-tickets-email
```

**Resultado:** Las políticas RLS no están funcionando. Necesitamos verificar las políticas.

### Escenario 4: Error con Resend 📧

**Logs esperados:**
```
📧 [WEBHOOK] Intentando enviar email...
📧 [SEND-EMAIL] Endpoint llamado...
...
✅ [SEND-EMAIL] Tickets obtenidos...
📧 [SEND-EMAIL] Enviando email a: ...
❌ [SEND-EMAIL] Error enviando email con Resend: ...
POST 500 /api/send-tickets-email
```

**Resultado:** Problema con Resend API (API key incorrecta, límite alcanzado, etc.).

---

## ⏱️ Tiempo Estimado

- Compra: 2-3 minutos
- Webhook procesa: 10-30 segundos
- Email llega: 1-2 minutos
- Revisar logs: 2-3 minutos
- **Total: ~8 minutos**

---

## 📝 Checklist Final

Antes de compartir los resultados, verificá:

- [ ] Realicé una compra exitosa
- [ ] Revisé los logs de Vercel (webhook y endpoint)
- [ ] Verifiqué si llegó el email
- [ ] Verifiqué el contenido del email
- [ ] Verifiqué `/mis-compras`
- [ ] Copié los logs relevantes
- [ ] Anoté el `purchaseId` (opcional)

---

## 🆘 Si Algo Sale Mal

Si después de revisar los logs no podés identificar el problema, compartime:

1. **Todos los logs** de `[WEBHOOK]` y `[SEND-EMAIL]`
2. **Todos los logs** de `POST /api/send-tickets-email`
3. **El `purchaseId`** de la compra
4. **Una descripción** de qué pasó (email no llegó, error en logs, etc.)

Con esa información podré identificar exactamente qué está fallando y cómo solucionarlo.
