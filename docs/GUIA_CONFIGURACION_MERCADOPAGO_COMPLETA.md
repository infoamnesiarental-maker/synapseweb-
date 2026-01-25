# 🔌 Guía Completa: Configuración de Mercado Pago desde Cero

## 📋 Índice
1. [Crear cuenta en Mercado Pago](#1-crear-cuenta-en-mercado-pago)
2. [Crear aplicación en Mercado Pago Developers](#2-crear-aplicación-en-mercado-pago-developers)
3. [Obtener credenciales (Access Token)](#3-obtener-credenciales-access-token)
4. [Configurar variables de entorno](#4-configurar-variables-de-entorno)
5. [Configurar webhook](#5-configurar-webhook)
6. [Probar con credenciales de prueba](#6-probar-con-credenciales-de-prueba)
7. [Activar cuenta de producción](#7-activar-cuenta-de-producción)

---

## 1. Crear cuenta en Mercado Pago

### Paso 1.1: Registrarse
1. Ve a [https://www.mercadopago.com.ar](https://www.mercadopago.com.ar)
2. Haz clic en **"Crear cuenta"** o **"Registrarse"**
3. Completa el formulario con tus datos:
   - Email
   - Contraseña
   - Datos personales (nombre, apellido, DNI, etc.)
4. Verifica tu email

### Paso 1.2: Completar perfil
1. Una vez dentro de tu cuenta, completa tu perfil
2. Agrega datos bancarios (para recibir pagos)
3. Verifica tu identidad (requerido para producción)

---

## 2. Crear aplicación en Mercado Pago Developers

### Paso 2.1: Acceder a Developers
1. Ve a [https://www.mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
2. Inicia sesión con tu cuenta de Mercado Pago
3. Haz clic en **"Tus integraciones"** o **"Mis aplicaciones"**

### Paso 2.2: Crear nueva aplicación
1. Haz clic en **"Crear nueva aplicación"**
2. Completa el formulario:
   - **Nombre de la aplicación:** `Synapse Ticketera` (o el que prefieras)
   - **Descripción:** `Plataforma de venta de tickets para eventos`
   - **Plataforma:** `Web`
   - **URL de producción:** `https://tu-dominio.vercel.app` (por ahora puedes poner `http://localhost:3000`)
   - **URL de redirección:** `https://tu-dominio.vercel.app/checkout/success`
3. Haz clic en **"Crear aplicación"**

### Paso 2.3: Guardar información
- Anota el **Application ID** (lo necesitarás después)
- La aplicación se creará con credenciales de **TEST** (modo prueba)

---

## 3. Obtener credenciales (Access Token)

### Paso 3.1: Acceder a credenciales
1. En la página de tu aplicación, ve a la pestaña **"Credenciales"**
2. Verás dos tipos de credenciales:
   - **Credenciales de prueba** (TEST) - Para desarrollo
   - **Credenciales de producción** (PROD) - Para producción

### Paso 3.2: Copiar Access Token de prueba
1. En **"Credenciales de prueba"**, busca **"Access Token"**
2. Haz clic en **"Ver"** o **"Copiar"** para revelar el token
3. **Copia este token** - Lo usarás en desarrollo

**⚠️ IMPORTANTE:** 
- El Access Token de prueba empieza con `TEST-`
- El Access Token de producción empieza con `APP_USR-`
- **NUNCA compartas tu Access Token** - Es como una contraseña

---

## 4. Configurar variables de entorno

### Paso 4.1: En desarrollo local (.env.local)

1. Abre el archivo `.env.local` en la raíz de tu proyecto
2. Agrega estas variables:

```env
# Mercado Pago - Credenciales de PRUEBA (para desarrollo)
MERCADOPAGO_ACCESS_TOKEN=TEST-tu-access-token-aqui

# URL de tu aplicación (para desarrollo local)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Ejemplo:**
```env
MERCADOPAGO_ACCESS_TOKEN=TEST-1234567890-abcdefghijklmnopqrstuvwxyz-1234567890
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Paso 4.2: En Vercel (Producción)

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com)
2. Ve a **Settings** → **Environment Variables**
3. Agrega las siguientes variables:

**Para Production:**
```
MERCADOPAGO_ACCESS_TOKEN = APP_USR-tu-access-token-de-produccion
NEXT_PUBLIC_APP_URL = https://tu-dominio.vercel.app
```

**Para Preview:**
```
MERCADOPAGO_ACCESS_TOKEN = TEST-tu-access-token-de-prueba
NEXT_PUBLIC_APP_URL = https://tu-dominio-preview.vercel.app
```

**Para Development:**
```
MERCADOPAGO_ACCESS_TOKEN = TEST-tu-access-token-de-prueba
NEXT_PUBLIC_APP_URL = http://localhost:3000
```

4. Haz clic en **"Save"**
5. **Redesplega tu aplicación** para que tome las nuevas variables

---

## 5. Configurar webhook

### Paso 5.1: Obtener URL del webhook

Tu webhook está en: `https://tu-dominio.vercel.app/api/mercadopago/webhook`

**Para desarrollo local:**
- Necesitas usar [ngrok](https://ngrok.com/) o similar para exponer tu localhost
- O puedes probar directamente en producción

### Paso 5.2: Configurar en Mercado Pago

1. Ve a tu aplicación en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Ve a la pestaña **"Webhooks"** o **"Notificaciones"**
3. Haz clic en **"Configurar webhook"** o **"Agregar URL"**
4. Ingresa la URL:
   ```
   https://tu-dominio.vercel.app/api/mercadopago/webhook
   ```
5. Selecciona los eventos a escuchar:
   - ✅ **payment** (creado)
   - ✅ **payment** (actualizado)
6. Haz clic en **"Guardar"**

### Paso 5.3: Verificar webhook (opcional)

Mercado Pago puede enviar un evento de prueba. Verifica en los logs de Vercel que llegue correctamente.

---

## 6. Probar con credenciales de prueba

### Paso 6.1: Tarjetas de prueba

Mercado Pago proporciona tarjetas de prueba para simular pagos:

**Tarjetas aprobadas:**
- **Visa:** `4509 9535 6623 3704`
- **Mastercard:** `5031 7557 3453 0604`
- **American Express:** `3711 803032 57522`

**Tarjetas rechazadas:**
- **Visa:** `5031 7557 3453 0604`
- **Mastercard:** `5031 4332 1540 6351`

**Datos para todas las tarjetas de prueba:**
- **CVV:** `123`
- **Fecha de vencimiento:** Cualquier fecha futura (ej: `12/25`)
- **Nombre del titular:** `APRO` (para aprobar) o `CONT` (para rechazar)

### Paso 6.2: Probar el flujo completo

1. Inicia tu aplicación en desarrollo:
   ```bash
   npm run dev
   ```

2. Crea un evento de prueba en tu dashboard de productora

3. Ve a la página del evento y haz clic en "Comprar Tickets"

4. Completa el checkout

5. Serás redirigido a Mercado Pago (modo prueba)

6. Usa una tarjeta de prueba:
   - Número: `4509 9535 6623 3704`
   - CVV: `123`
   - Vencimiento: `12/25`
   - Nombre: `APRO`

7. Completa el pago

8. Verifica que:
   - Te redirija a `/checkout/success`
   - El estado de la compra se actualice a `completed`
   - Recibas el email con los tickets

---

## 7. Activar cuenta de producción

### Paso 7.1: Completar requisitos

Para usar Mercado Pago en producción necesitas:

1. **Verificar tu identidad:**
   - Subir foto de DNI
   - Completar datos personales

2. **Agregar cuenta bancaria:**
   - Para recibir los pagos
   - Datos de tu cuenta bancaria

3. **Completar información fiscal:**
   - CUIT/CUIL
   - Datos de facturación

### Paso 7.2: Obtener credenciales de producción

1. Una vez que tu cuenta esté verificada, ve a tu aplicación
2. Ve a **"Credenciales"** → **"Credenciales de producción"**
3. Copia el **Access Token de producción** (empieza con `APP_USR-`)
4. Actualiza la variable `MERCADOPAGO_ACCESS_TOKEN` en Vercel con este token

### Paso 7.3: Actualizar URLs en la aplicación

1. En tu aplicación de Mercado Pago, actualiza:
   - **URL de producción:** `https://tu-dominio.vercel.app`
   - **URL de redirección:** `https://tu-dominio.vercel.app/checkout/success`

2. Actualiza el webhook con la URL de producción

---

## 🔍 Verificar que todo funciona

### Checklist de verificación:

- [ ] Access Token configurado en `.env.local` (desarrollo)
- [ ] Access Token configurado en Vercel (producción)
- [ ] `NEXT_PUBLIC_APP_URL` configurado correctamente
- [ ] Webhook configurado en Mercado Pago
- [ ] Probado con tarjeta de prueba en desarrollo
- [ ] Verificado que los pagos se actualizan correctamente
- [ ] Verificado que se envían emails con tickets

---

## 🐛 Solución de problemas comunes

### Error: "MERCADOPAGO_ACCESS_TOKEN no está configurado"
- **Solución:** Verifica que la variable esté en `.env.local` y reinicia el servidor de desarrollo

### Error: "Invalid access token"
- **Solución:** Verifica que copiaste el token completo sin espacios

### Webhook no recibe notificaciones
- **Solución:** 
  - Verifica que la URL del webhook sea accesible públicamente
  - En desarrollo local, usa ngrok para exponer tu localhost
  - Verifica los logs de Vercel para ver si llegan las notificaciones

### Pagos no se actualizan automáticamente
- **Solución:**
  - Verifica que el webhook esté configurado correctamente
  - Verifica que la URL del webhook sea correcta
  - Revisa los logs del servidor para ver errores

---

## 📚 Recursos útiles

- [Documentación oficial de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs)
- [SDK de Mercado Pago para Node.js](https://github.com/mercadopago/sdk-nodejs)
- [Guía de webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- [Tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/testing)

---

## ⚠️ Notas importantes

1. **Nunca compartas tus credenciales** - Son como contraseñas
2. **Usa credenciales de prueba en desarrollo** - No uses producción hasta estar listo
3. **El webhook necesita una URL pública** - En desarrollo local usa ngrok
4. **Los reembolsos requieren cuenta verificada** - Completa la verificación antes de activar producción

---

**¿Necesitas ayuda?** Si tienes problemas en algún paso, avísame y te ayudo a resolverlo.
