# 🧪 Guía de Testing en Producción - Pago Real

Esta guía te ayudará a testear el flujo completo de compra y envío de emails con QR en **producción** usando un **pago real** de bajo monto.

---

## ✅ Paso 1: Verificar que el Deploy se Completó

1. **Abrí Vercel Dashboard:**
   - Ve a: https://vercel.com/dashboard
   - Seleccioná tu proyecto `synapseweb`

2. **Verificá el último deploy:**
   - Debe estar en estado **"Ready"** (verde) ✅
   - El commit debe ser: `feat: mejorar idempotencia de webhook...`
   - Si está en "Building" o "Error", esperá a que termine

3. **Verificá la URL de producción:**
   - Debe ser: `https://synapseweb-sigma.vercel.app` (o tu dominio)
   - Abrí la URL en el navegador y verificá que la app carga correctamente

**✅ Checklist:**
- [ ] Deploy completado sin errores
- [ ] App carga correctamente en producción
- [ ] No hay errores visibles en la página

---

## ✅ Paso 2: Verificar Variables de Entorno en Vercel

1. **En Vercel Dashboard:**
   - Settings → Environment Variables

2. **Verificá estas variables (deben estar configuradas):**
   - [ ] `NEXT_PUBLIC_APP_URL` = `https://synapseweb-sigma.vercel.app` (o tu dominio)
   - [ ] `MERCADOPAGO_ACCESS_TOKEN` = Token de producción (debe empezar con `APP_USR-`)
   - [ ] `RESEND_API_KEY` = Tu API key de Resend
   - [ ] `NEXT_PUBLIC_SUPABASE_URL` = URL de Supabase
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Anon key de Supabase
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` = Service role key de Supabase

3. **Si falta alguna variable:**
   - Agregala y hacé un nuevo deploy (o esperá a que se redepliegue automáticamente)

**✅ Checklist:**
- [ ] Todas las variables están configuradas
- [ ] `NEXT_PUBLIC_APP_URL` tiene la URL correcta de producción

---

## 🛒 Paso 3: Preparar la Compra de Prueba

1. **Abrí tu app en producción:**
   - URL: `https://synapseweb-sigma.vercel.app` (o tu dominio)

2. **Elegí un evento con precio bajo:**
   - Buscá un evento publicado con precio mínimo (ej: $100, $500)
   - Esto minimiza el costo del test
   - Verificá que el evento esté activo y tenga tickets disponibles

3. **Prepará los datos:**
   - Email real donde querés recibir el ticket (debe estar verificado en Resend si estás en modo desarrollo)
   - Datos de tarjeta de crédito/débito válida
   - Nombre y teléfono (opcional)

**✅ Checklist:**
- [ ] Evento seleccionado con precio bajo
- [ ] Email preparado para recibir el ticket
- [ ] Tarjeta de pago lista

---

## 💳 Paso 4: Realizar la Compra

1. **En la app de producción:**
   - Entrá al evento que elegiste
   - Seleccioná **1 ticket** (mínimo necesario)
   - Hacé clic en "Comprar" o "Agregar al carrito"

2. **Completá el checkout:**
   - Ingresá tu email real
   - Ingresá tu nombre (opcional)
   - Ingresá tu teléfono (opcional)
   - Hacé clic en "Continuar al pago"

3. **Completá el pago en Mercado Pago:**
   - Serás redirigido a Mercado Pago
   - Ingresá los datos de tu tarjeta real
   - Completá el pago
   - **IMPORTANTE:** Este es un pago REAL, se cobrará dinero de verdad

4. **Esperá la redirección:**
   - Después del pago, Mercado Pago te redirigirá a `/checkout/success`
   - Verificá que veas un mensaje de éxito

**✅ Checklist:**
- [ ] Compra realizada exitosamente
- [ ] Redirección a `/checkout/success` funcionó
- [ ] Pago procesado en Mercado Pago

---

## 📧 Paso 5: Verificar que Llegó el Email con QR

1. **Revisá tu email:**
   - Abrí la bandeja de entrada del email que usaste
   - Buscá un email con asunto: `Tus Entradas - [Nombre del Evento]`
   - Si no llega inmediatamente, esperá 1-2 minutos (puede haber delay)

2. **Verificá el contenido del email:**
   - [ ] Debe tener el nombre del evento
   - [ ] Debe tener tu nombre (si lo ingresaste)
   - [ ] Debe tener el código QR visible
   - [ ] Debe tener el número de ticket
   - [ ] Debe tener un link a "Mis Compras"

3. **Si NO llegó el email:**
   - Revisá la carpeta de spam
   - Verificá los logs en Vercel (Paso 6)
   - Verificá que el email esté verificado en Resend (si estás en modo desarrollo)

**✅ Checklist:**
- [ ] Email recibido
- [ ] QR code visible en el email
- [ ] Información del evento correcta

---

## 📊 Paso 6: Verificar Logs en Vercel

1. **Abrí Vercel Dashboard:**
   - Tu proyecto → **Logs** (pestaña superior)

2. **Buscá estos logs (en orden cronológico, de más reciente a más antiguo):**

   **a) Logs del Webhook (debe aparecer primero):**
   ```
   📥 Webhook recibido de Mercado Pago: { type: 'payment', data: { id: '...' } }
   ✅ Compra [PURCHASE_ID] actualizada a estado: completed
   💰 Gastos operativos: $...
   💵 Margen neto: $...
   📧 [WEBHOOK] Intentando enviar email para compra [PURCHASE_ID] a [email] usando endpoint: https://synapseweb-sigma.vercel.app/api/send-tickets-email
   ```

   **b) Logs del Endpoint de Email (debe aparecer después):**
   ```
   📧 [SEND-EMAIL] Endpoint llamado - Iniciando procesamiento
   📧 [SEND-EMAIL] Parámetros recibidos: { purchaseId: '...', email: '...', userName: '...' }
   ✅ [SEND-EMAIL] Compra obtenida: { purchaseId: '...', eventId: '...', guestEmail: '...' }
   ✅ [SEND-EMAIL] Tickets obtenidos: X ticket(s)
   📧 [SEND-EMAIL] Inicializando Resend...
   📧 [SEND-EMAIL] Enviando email a: [email]
   ✅ [SEND-EMAIL] Email enviado exitosamente - messageId: [id], duración: [X]ms
   ```

3. **Verificá que NO haya errores:**
   - No debe haber logs de error (❌)
   - No debe haber warnings críticos (⚠️)
   - La URL del endpoint debe ser de producción (no localhost)

**✅ Checklist:**
- [ ] Logs del webhook aparecen correctamente
- [ ] Logs del email aparecen correctamente
- [ ] URL del endpoint es de producción (no localhost)
- [ ] No hay errores en los logs

---

## 🔍 Paso 7: Verificar en Supabase

1. **Abrí Supabase Dashboard:**
   - Ve a tu proyecto en Supabase

2. **Verificá la compra:**
   ```sql
   SELECT 
     id,
     payment_provider_id,
     payment_status,
     guest_email,
     total_amount,
     created_at
   FROM purchases 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   
   **Resultado esperado:**
   - `payment_status` = `'completed'`
   - `payment_provider_id` = ID del pago de Mercado Pago
   - `guest_email` = Tu email

3. **Verificá los tickets creados:**
   ```sql
   SELECT 
     t.id,
     t.ticket_number,
     t.qr_code,
     t.status,
     t.created_at
   FROM tickets t
   WHERE t.purchase_id = 'TU_PURCHASE_ID'  -- Reemplazá con el ID de la compra
   ORDER BY t.created_at DESC;
   ```
   
   **Resultado esperado:**
   - Debe haber tickets creados
   - Cada ticket debe tener un `qr_code` único
   - Cada ticket debe tener un `ticket_number` único
   - `status` = `'valid'`

**✅ Checklist:**
- [ ] Compra en estado `completed`
- [ ] Tickets creados correctamente
- [ ] QR codes generados

---

## 🔄 Paso 8: Testear Idempotencia (Opcional)

Si querés verificar que no se envían emails duplicados:

1. **Simulá que el webhook se llama dos veces:**
   - Obtené el `payment_provider_id` de la compra que hiciste
   - Ejecutá este comando DOS VECES (con el mismo payment_provider_id):

   ```bash
   curl -X POST https://synapseweb-sigma.vercel.app/api/mercadopago/webhook \
     -H "Content-Type: application/json" \
     -d '{"type":"payment","data":{"id":"TU_PAYMENT_PROVIDER_ID"}}'
   ```

2. **Verificá los logs:**
   - En la primera llamada: Debe crear tickets y enviar email
   - En la segunda llamada: Debe mostrar `ℹ️ Email ya enviado para compra...` (NO debe enviar email de nuevo)

3. **Verificá en Supabase:**
   ```sql
   SELECT COUNT(*) as tickets_count
   FROM tickets 
   WHERE purchase_id = 'TU_PURCHASE_ID';
   ```
   
   **Resultado esperado:**
   - Debe haber la misma cantidad de tickets (no duplicados)
   - `tickets_count` = 1 (o la cantidad que compraste)

**✅ Checklist:**
- [ ] Primera llamada: Email enviado
- [ ] Segunda llamada: Email NO enviado (idempotencia funcionando)
- [ ] No se duplicaron tickets

---

## ✅ Resumen de Verificaciones

### ✅ Todo Funcionó Correctamente Si:

- [ ] Deploy completado sin errores
- [ ] Compra realizada exitosamente
- [ ] Email recibido con QR code
- [ ] Logs en Vercel muestran el flujo completo
- [ ] Tickets creados en Supabase
- [ ] URL del endpoint es de producción (no localhost)
- [ ] Idempotencia funcionando (no emails duplicados)

### ❌ Si Algo Falló:

1. **Email no llegó:**
   - Revisá logs en Vercel (busca errores de Resend)
   - Verificá que el email esté verificado en Resend
   - Revisá carpeta de spam

2. **Tickets no se crearon:**
   - Revisá logs del webhook en Vercel
   - Verificá que el pago esté en estado `completed` en Supabase
   - Verificá que `payment_provider_data` tenga `tickets_data`

3. **URL incorrecta (localhost):**
   - Verificá que `NEXT_PUBLIC_APP_URL` esté configurada en Vercel
   - Hacé un nuevo deploy después de agregar la variable

---

## 📝 Notas Importantes

1. **Este es un pago REAL:** Se cobrará dinero de verdad. Usá un monto bajo para minimizar el costo.

2. **El webhook puede tardar:** Mercado Pago puede tardar unos segundos en enviar el webhook. Si el email no llega inmediatamente, esperá 1-2 minutos.

3. **Logs en Vercel:** Los logs pueden tardar unos segundos en aparecer. Refrescá la página si no los ves.

4. **Email en desarrollo:** Si estás en modo desarrollo de Resend, solo podrás enviar emails a direcciones verificadas.

---

## 🎯 Próximos Pasos

Una vez que verifiques que todo funciona:

1. ✅ El sistema está listo para recibir compras reales
2. ✅ Los emails se envían correctamente
3. ✅ Los tickets se crean con QR codes
4. ✅ La idempotencia previene duplicados

**¡Todo listo para producción!** 🚀
