# Estado Actual Ticketera - Seguimiento de Cierre

Fecha: 2026-03-23

## Objetivo

Cerrar la ticketera con un tablero unico para seguir:

- lo ultimo que agregamos,
- que ya funciona,
- que esta fallando o pendiente,
- y que falta para terminar.

Convencion de estados:

- `🟢` = listo y validado
- `🟡` = implementado parcialmente o falta validar en produccion
- `🔴` = falla activa o bloqueante

---

## 1) Ultimos cambios que realizamos (resumen)

### `🟡` Cambios recientes en webhook Mercado Pago (15-16 marzo)

- Se robustecio el parsing del webhook para soportar body JSON y query params.
- Se agrego manejo de UUID para intentar resolver `payment_id` cuando llega `external_reference`.
- Se incorporo cliente admin (`service role`) para evitar bloqueos por RLS en endpoints criticos.
- Se fortalecio la idempotencia con `webhook_logs` y manejo de race conditions.
- Se agrego/fortalecio el envio de email con QR desde el webhook via `/api/send-tickets-email`.
- Se agregaron documentos tecnicos de analisis y testing en `docs/`.

### `🟡` Ultimo cambio local sin commit (actual)

- En `app/api/mercadopago/webhook/route.ts` se agrego filtro para ignorar notificaciones no `payment`.
- Se normalizo `webhook_type` con fallback a `'payment'` al guardar en `webhook_logs`.

---

## 2) Estado funcional actual (ticketera)

### `🟢` Flujo base cubierto

- Webhook recibe notificacion y consulta estado real del pago en Mercado Pago.
- Compra se actualiza en `purchases` con mapeo de estado (`pending/completed/failed/refunded`).
- Para pagos `completed`, se crean tickets con `ticket_number` y `qr_code`.
- Se crea transferencia para el productor cuando corresponde.
- Existe idempotencia para evitar reprocesar el mismo `payment_id`.

### `🟡` Envio de QR por email

- La logica existe y se dispara desde webhook.
- Hay evidencia de pruebas locales exitosas en docs.
- Falta cierre formal con pruebas de punta a punta en produccion (casos felices + errores).

---

## 3) Fallas / riesgos detectados hoy

### `🔴` Riesgo de inconsistencia entre entornos (local vs produccion)

- Hay historial de regresiones en webhook (funcionaba parcialmente antes y luego se rompio).
- Se necesita confirmar que las variables de entorno productivas estan correctas:
  - `MERCADOPAGO_ACCESS_TOKEN`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL`
  - `RESEND_API_KEY`

### `🟡` Validacion pendiente de casos limite del webhook

- Notificaciones no `payment` ahora se ignoran (correcto), pero falta validar en produccion real.
- Cuando llega UUID, hay logica de recuperacion; falta confirmar estabilidad con trafico real.

### `🟡` Riesgo operativo de envio email

- Si falla `/api/send-tickets-email`, el webhook no corta el flujo principal (bien para resiliencia).
- Falta checklist de observabilidad operativa (metricas/alertas) para detectar fallas de email a tiempo.

---

## 4) Checklist de cierre final (con semaforo)

## Bloque A - Webhook y pagos

- [ ] `🟡` Validar webhook real de MP en produccion (pago aprobado)
- [ ] `🟡` Validar webhook duplicado (idempotencia, sin tickets/email duplicados)
- [ ] `🟡` Validar webhook de tipo no `payment` (debe ignorarse sin romper flujo)
- [ ] `🟡` Validar caso `payment failed` (no crear tickets, no email)
- [ ] `🟡` Validar caso `refunded` (cancelacion de transferencia)

## Bloque B - Tickets y QR

- [ ] `🟡` Confirmar que cada compra aprobada genera todos los tickets esperados
- [ ] `🟡` Confirmar unicidad de `ticket_number` y `qr_code`
- [ ] `🟡` Confirmar que no haya decrementos/updates incorrectos en stock (`ticket_types.quantity_sold`)

## Bloque C - Email QR

- [ ] `🟡` Confirmar envio de email en produccion con compra real de prueba
- [ ] `🟡` Confirmar contenido correcto (evento, fecha, cantidad, QR)
- [ ] `🟡` Confirmar fallback y trazabilidad de errores en logs

## Bloque D - Operacion y hardening

- [ ] `🔴` Definir tablero basico de monitoreo (webhook ok/error, email ok/error)
- [ ] `🔴` Definir procedimiento de reintento/manual recovery para compras sin email
- [ ] `🟡` Ejecutar test de regresion rapido antes de cada deploy (script/checklist fijo)

---

## 5) Propuesta de criterio de "ticketera terminada"

Pasamos todo a `🟢` cuando se cumpla:

1. 3 pagos de prueba exitosos en produccion sin duplicados.
2. 1 caso `failed` y 1 caso `refunded` validados correctamente.
3. 100% de esos casos con email QR correcto o recovery documentado.
4. Checklist de monitoreo/reintentos documentado y aplicado.

---

## 6) Proximo paso recomendado (hoy)

1. Congelar este documento como tablero oficial de cierre.
2. Ejecutar Bloque A + C en un ciclo corto de pruebas.
3. Marcar cada item con `🟢/🟡/🔴` apenas termine cada test.
4. Si queres, en la siguiente iteracion te lo convierto a una version "operativa diaria" con:
   - columna de responsable,
   - fecha de verificacion,
   - evidencia (link a log o captura),
   - y estado final.

---

## 7) Lista maestra TODO (orden sugerido)

**Como usarla:** segui el orden. Cuando completes un paso, avisame el **numero** (ej: "listo el 3") y lo marcamos aca y en el checklist de arriba. Cambia `[ ]` por `[x]` en tu copia cuando quieras.

### Preparacion y codigo

| # | Tarea | Estado |
|---|--------|--------|
| 1 | Subir a git y desplegar los cambios pendientes del webhook (filtro `type !== payment`, `webhook_type` fallback), si aun no estan en produccion | [ ] |
| 2 | En Vercel/hosting: verificar que existan y sean correctas `MERCADOPAGO_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY` | [ ] |

### Bloque A — Webhook y pagos (produccion)

| # | Tarea | Estado |
|---|--------|--------|
| 3 | Pago **aprobado** real: webhook procesa, compra `completed`, tickets creados | [ ] |
| 4 | **Idempotencia:** mismo pago notificado 2 veces (o reintento MP): sin tickets duplicados, sin email duplicado | [ ] |
| 5 | Notificacion **no** `payment`: se ignora, logs OK, nada se rompe | [ ] |
| 6 | Pago **failed/rechazado:** sin tickets nuevos, sin email | [ ] |
| 7 | Pago **refunded:** transferencia queda coherente (cancelada segun logica actual) | [ ] |

### Bloque B — Tickets y stock

| # | Tarea | Estado |
|---|--------|--------|
| 8 | Cantidad de tickets = cantidad comprada (por tipo) | [ ] |
| 9 | Unicidad de `ticket_number` y `qr_code` (sin duplicados en BD) | [ ] |
| 10 | `ticket_types.quantity_sold` coherente con ventas (no sobre-vende ni descuadra) | [ ] |

### Bloque C — Email QR

| # | Tarea | Estado |
|---|--------|--------|
| 11 | Email con QR **llega** en produccion (compra de prueba) | [ ] |
| 12 | Contenido del mail: evento, fecha, cantidad, QRs legibles | [ ] |
| 13 | Si el mail falla: se ve error en logs (Vercel) y queda claro como reproducir | [ ] |

### Bloque D — Operacion

| # | Tarea | Estado |
|---|--------|--------|
| 14 | Definir **como** vas a revisar salud (logs Vercel / queries SQL semanales / otra) | [ ] |
| 15 | Escribir **recovery**: compra pagada pero sin email (reintento manual o endpoint) | [ ] |
| 16 | Mini checklist antes de cada deploy (al menos: env vars + 1 curl de smoke si aplica) | [ ] |

### Criterio final "proyecto cerrado"

| # | Tarea | Estado |
|---|--------|--------|
| 17 | **3** pagos de prueba en produccion OK, sin duplicados | [ ] |
| 18 | **1** caso failed + **1** caso refunded validados | [ ] |
| 19 | En esos casos: email OK **o** recovery documentado y probado una vez | [ ] |
