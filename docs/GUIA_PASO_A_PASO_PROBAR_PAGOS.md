# 📖 Guía Paso a Paso: Cómo Probar Pagos con Mercado Pago API

**Fuente:** Documentación oficial de Mercado Pago Developers  
**URL Base:** https://www.mercadopago.com.ar/developers/es/docs

---

## 📋 Índice

1. [Requisitos Previos](#1-requisitos-previos)
2. [Paso 1: Verificar Credenciales de Prueba](#paso-1-verificar-credenciales-de-prueba)
3. [Paso 2: Crear Cuentas de Prueba](#paso-2-crear-cuentas-de-prueba)
4. [Paso 3: Obtener Tarjetas de Prueba](#paso-3-obtener-tarjetas-de-prueba)
5. [Paso 4: Probar el Flujo de Pago Completo](#paso-4-probar-el-flujo-de-pago-completo)
6. [Paso 5: Verificar el Pago](#paso-5-verificar-el-pago)
7. [Solución de Problemas Comunes](#solución-de-problemas-comunes)

---

## 1. Requisitos Previos

Antes de probar pagos, asegúrate de tener:

- ✅ Cuenta de Mercado Pago creada
- ✅ Aplicación creada en Mercado Pago Developers
- ✅ Access Token de prueba configurado en `.env.local`
- ✅ Tu aplicación corriendo en `http://localhost:3000`

**Documentación oficial:**  
https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test

---

## Paso 1: Verificar Credenciales de Prueba

### 1.1 Acceder a Mercado Pago Developers

1. Ve a: **https://www.mercadopago.com.ar/developers**
2. Inicia sesión con tu cuenta de Mercado Pago
3. Selecciona tu aplicación: **"Synapse Ticketera"**

### 1.2 Verificar Access Token

1. En el menú lateral, ve a **"PRUEBAS"** → **"Credenciales de prueba"**
2. Verifica que tu **Access Token** esté visible
3. El Access Token debe empezar con `APP_USR-` (para Checkout Pro)
4. **Copia este token completo**

### 1.3 Verificar en tu código

Abre tu archivo `.env.local` y verifica que tengas:

```env
MERCADOPAGO_ACCESS_TOKEN=TU_ACCESS_TOKEN_AQUI
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**⚠️ IMPORTANTE:** 
- El Access Token debe ser EXACTAMENTE el mismo que aparece en Mercado Pago Developers
- No debe tener espacios al inicio o final
- Debe estar en una sola línea

**Documentación oficial:**  
https://www.mercadopago.com.ar/developers/es/docs/your-integrations/credentials

---

## Paso 2: Crear Cuentas de Prueba

### 2.1 Acceder a Cuentas de Prueba

1. En Mercado Pago Developers, ve a: **"PRUEBAS"** → **"Cuentas de prueba"**
2. Verás dos tipos de cuentas:
   - **Vendedor** (para recibir pagos)
   - **Comprador** (para hacer pagos)

### 2.2 Usar Cuenta de Prueba Existente

**NO necesitas crear una cuenta nueva.** Usa la cuenta existente:

1. Busca la tarjeta **"Cuenta prueba Comprador"**
2. Copia estos datos:
   - **Usuario:** `TESTUSER3381...` (copia el nombre completo)
   - **Contraseña:** `Uu1QKcbMtz`
   - **User ID:** `3007590057`

### 2.3 Alternativa: Crear Nueva Cuenta (si es necesario)

Si necesitas crear una nueva cuenta:

1. Haz clic en **"Crear cuenta de prueba"** (botón azul arriba a la derecha)
2. Selecciona tipo: **"Comprador"**
3. Completa el formulario:
   - País: Argentina
   - Email: Puedes usar cualquier email (ej: `test@test.com`)
   - Nombre: Cualquier nombre
4. Haz clic en **"Crear"**
5. **IMPORTANTE:** Si aparece un modal pidiendo verificar email:
   - **NO necesitas verificar el email en modo sandbox**
   - Cierra el modal y continúa
   - La cuenta ya está creada y lista para usar

**Documentación oficial:**  
https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/your-integrations/test/accounts

---

## Paso 3: Obtener Tarjetas de Prueba

### 3.1 Acceder a Tarjetas de Prueba

1. En Mercado Pago Developers, ve a: **"PRUEBAS"** → **"Tarjetas de prueba"**
2. Verás una lista de tarjetas disponibles para probar

### 3.2 Tarjeta Recomendada para Probar

**Tarjeta Visa (Aprobada):**
- **Número:** `4509 9535 6623 3704`
- **CVV:** `123`
- **Fecha de vencimiento:** Cualquier fecha futura (ej: `12/25`)
- **Nombre del titular:** `APRO` ⚠️ **MUY IMPORTANTE**

**⚠️ CRÍTICO:** El nombre del titular DEBE ser exactamente **"APRO"** (en mayúsculas) para que el pago sea aprobado.

### 3.3 Otras Tarjetas de Prueba

**Tarjeta Mastercard (Aprobada):**
- **Número:** `5031 7557 3453 0604`
- **CVV:** `123`
- **Vencimiento:** `12/25`
- **Nombre:** `APRO`

**Tarjeta Visa (Rechazada - para probar errores):**
- **Número:** `5031 7557 3453 0604`
- **CVV:** `123`
- **Vencimiento:** `12/25`
- **Nombre:** `CONT` (para rechazar)

**Documentación oficial:**  
https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases

---

## Paso 4: Probar el Flujo de Pago Completo

### 4.1 Iniciar tu Aplicación

1. Abre una terminal en la raíz de tu proyecto
2. Ejecuta:
   ```bash
   npm run dev
   ```
3. Verifica que la aplicación esté corriendo en `http://localhost:3000`

### 4.2 Crear una Compra de Prueba

1. Abre tu navegador en modo **incógnito** (para evitar sesiones de Mercado Pago)
2. Ve a: `http://localhost:3000`
3. Navega a un evento y haz clic en **"Comprar Tickets"**
4. Completa el formulario de checkout:
   - Email: Cualquier email (ej: `test@test.com`)
   - Nombre: Cualquier nombre
   - Teléfono: Cualquier número
5. Haz clic en **"Confirmar Compra"**

### 4.3 Redirección a Mercado Pago

1. Serás redirigido a Mercado Pago (modo sandbox)
2. Verás la URL: `https://sandbox.mercadopago.com.ar/...`
3. **NO inicies sesión con tu cuenta personal de Mercado Pago**

### 4.4 Pagar como Invitado (Recomendado)

**Opción A: Pagar sin cuenta (más fácil)**

1. En la pantalla de Mercado Pago, busca la opción **"Pagar como invitado"** o **"Continuar sin cuenta"**
2. Si no aparece, haz clic en **"Pagar con tarjeta"** directamente
3. Completa los datos de la tarjeta:
   - **Número:** `4509 9535 6623 3704`
   - **CVV:** `123`
   - **Vencimiento:** `12/25`
   - **Nombre del titular:** `APRO` ⚠️ **EXACTAMENTE "APRO"**
   - **DNI:** Cualquier número (ej: `12345678`)
4. Haz clic en **"Pagar"**

**Opción B: Iniciar sesión con cuenta de prueba**

Si prefieres iniciar sesión:

1. Haz clic en **"Iniciar sesión"** o **"Ya tengo cuenta"**
2. Ingresa las credenciales de la cuenta de prueba:
   - **Usuario:** `TESTUSER3381...` (el nombre completo)
   - **Contraseña:** `Uu1QKcbMtz`
3. Completa el pago con la tarjeta de prueba

### 4.5 Completar el Pago

1. Después de ingresar los datos de la tarjeta, haz clic en **"Pagar"**
2. El pago debería ser aprobado automáticamente (porque usaste `APRO` como nombre)
3. Serás redirigido a: `http://localhost:3000/checkout/success?purchaseId=...`

**Documentación oficial:**  
https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases

---

## Paso 5: Verificar el Pago

### 5.1 Verificar en tu Aplicación

1. Después de ser redirigido a `/checkout/success`, verifica que:
   - ✅ La página muestre un mensaje de éxito
   - ✅ Se muestre el ID de la compra
   - ✅ El estado del pago sea `completed`

### 5.2 Verificar en la Base de Datos

1. Ve a tu dashboard de Supabase
2. Abre la tabla `purchases`
3. Busca la compra recién creada
4. Verifica que:
   - ✅ `payment_status` = `completed`
   - ✅ `payment_provider_id` tenga un valor (ID del pago de Mercado Pago)
   - ✅ `payment_provider_data` tenga información del pago

### 5.3 Verificar en Mercado Pago Developers

1. Ve a Mercado Pago Developers
2. Ve a **"PRUEBAS"** → **"Movimientos"** o **"Pagos"**
3. Deberías ver el pago de prueba listado
4. Verifica que el estado sea **"Aprobado"**

### 5.4 Verificar Email (si está configurado)

1. Revisa el email que usaste en el checkout
2. Deberías recibir un email con los tickets (si el webhook funcionó correctamente)

**Documentación oficial:**  
https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases

---

## Solución de Problemas Comunes

### ❌ Error: "Una de las partes con la que intentás hacer el pago es de prueba"

**Causa:** Estás usando credenciales de prueba pero intentando pagar con una cuenta de producción (o viceversa).

**Solución:**
1. Verifica que tu Access Token en `.env.local` sea de **prueba** (debe empezar con `APP_USR-` y estar en la sección "Credenciales de prueba")
2. **NO inicies sesión** con tu cuenta personal de Mercado Pago en el sandbox
3. Usa **"Pagar como invitado"** o inicia sesión con la **cuenta de prueba** que creaste
4. Asegúrate de estar usando la URL `sandbox.mercadopago.com.ar` (no `www.mercadopago.com.ar`)

**Documentación oficial:**  
https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases

---

### ❌ Error: "Ingresá el código que te enviamos por e-mail"

**Causa:** Mercado Pago está pidiendo verificar el email de una cuenta nueva.

**Solución:**
1. **NO necesitas verificar el email** en modo sandbox
2. Cierra el modal de verificación
3. Usa la cuenta de prueba existente (`TESTUSER3381...`) en lugar de crear una nueva
4. O paga como invitado sin crear cuenta

**Documentación oficial:**  
https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/your-integrations/test/accounts

---

### ❌ El pago no se aprueba

**Causa:** El nombre del titular de la tarjeta no es correcto.

**Solución:**
1. Verifica que el nombre del titular sea exactamente **"APRO"** (en mayúsculas)
2. No uses tu nombre real
3. No uses espacios antes o después de "APRO"

**Documentación oficial:**  
https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases

---

### ❌ No me redirige a Mercado Pago

**Causa:** Error al crear la preferencia de pago.

**Solución:**
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console" y busca errores
3. Verifica en la terminal del servidor si hay errores
4. Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté configurado correctamente
5. Verifica que la URL en `NEXT_PUBLIC_APP_URL` sea correcta

---

### ❌ El webhook no recibe notificaciones

**Causa:** El webhook no está configurado o la URL no es accesible.

**Solución:**
1. Verifica que el webhook esté configurado en Mercado Pago Developers
2. Para desarrollo local, usa [ngrok](https://ngrok.com/) para exponer tu localhost
3. Verifica los logs de tu servidor para ver si llegan las notificaciones

**Documentación oficial:**  
https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks

---

## 📚 Recursos Oficiales

- **Documentación principal:** https://www.mercadopago.com.ar/developers/es/docs
- **Prueba de compras:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases
- **Cuentas de prueba:** https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/your-integrations/test/accounts
- **Tarjetas de prueba:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases
- **Webhooks:** https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
- **Discord de la comunidad:** https://discord.com/invite/yth5bMKhdn

---

## ✅ Checklist Final

Antes de considerar que todo funciona, verifica:

- [ ] Access Token de prueba configurado correctamente
- [ ] Cuenta de prueba de comprador disponible
- [ ] Tarjetas de prueba conocidas
- [ ] Flujo de checkout funciona (redirige a Mercado Pago)
- [ ] Pago se completa exitosamente
- [ ] Redirección a `/checkout/success` funciona
- [ ] Estado del pago se actualiza a `completed` en la BD
- [ ] Webhook recibe notificaciones (opcional)
- [ ] Email con tickets se envía (si está configurado)

---

**Última actualización:** Basado en la documentación oficial de Mercado Pago Developers  
**Versión:** 1.0
