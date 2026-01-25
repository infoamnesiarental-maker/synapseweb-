# 🔌 Integración de Mercado Pago - Synapse

## 📋 Configuración Requerida

### 1. Variables de Entorno

Agrega estas variables a tu archivo `.env.local`:

```env
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=tu-access-token-de-mercadopago
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

### 2. Obtener Credenciales de Mercado Pago

1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Crea una aplicación o usa una existente
3. Obtén tu **Access Token** (producción o test)
4. Para testing, usa las credenciales de prueba

### 3. Configurar Webhook

1. En el dashboard de Mercado Pago, ve a **Webhooks**
2. Agrega la URL: `https://tu-dominio.vercel.app/api/mercadopago/webhook`
3. Selecciona los eventos: `payment` (creado, actualizado)

### 4. Credenciales de Prueba

Para testing, puedes usar estas credenciales de prueba:

**Vendedor de Prueba:**
- Access Token: Usa el token de prueba de tu cuenta
- Puedes crear preferencias de prueba que redirigen a un checkout simulado

**Tarjetas de Prueba:**
- Visa aprobada: `4509 9535 6623 3704`
- Visa rechazada: `5031 7557 3453 0604`
- Mastercard aprobada: `5031 7557 3453 0604`

## 🔄 Flujo de Pago

1. **Usuario completa checkout** → Se crea compra con estado `pending`
2. **Se crea preferencia en Mercado Pago** → Se obtiene URL de pago
3. **Usuario redirige a Mercado Pago** → Completa el pago
4. **Mercado Pago envía webhook** → Se actualiza estado de compra
5. **Usuario vuelve a la app** → Página de éxito con tickets

## 📝 Archivos Creados

- `lib/mercadopago.ts` - Cliente de Mercado Pago
- `app/api/mercadopago/create-preference/route.ts` - API para crear preferencias
- `app/api/mercadopago/webhook/route.ts` - Handler de webhooks
- `lib/hooks/useCheckout.ts` - Modificado para integrar Mercado Pago
- `components/checkout/CheckoutWizard.tsx` - Modificado para redirigir a MP

## ⚠️ Notas Importantes

1. **En desarrollo local:** El webhook necesita una URL pública. Usa [ngrok](https://ngrok.com/) o similar para exponer tu localhost
2. **En producción:** Asegúrate de configurar la URL correcta en `NEXT_PUBLIC_APP_URL`
3. **Seguridad:** En producción, valida la firma del webhook de Mercado Pago
4. **Testing:** Usa siempre credenciales de prueba antes de pasar a producción

## 🧪 Probar la Integración

1. Configura las variables de entorno
2. Crea una compra de prueba
3. Verifica que se redirija a Mercado Pago
4. Completa el pago con una tarjeta de prueba
5. Verifica que el webhook actualice el estado de la compra
6. Verifica que se envíe el email con los tickets
