# 📧 Configuración de Email - Resend

Esta guía te ayudará a configurar el envío automático de emails con Resend.

---

## 🔧 Paso 1: Crear cuenta en Resend

1. Ve a [https://resend.com](https://resend.com)
2. Crea una cuenta gratuita
3. Verifica tu email

---

## 🔑 Paso 2: Obtener API Key

1. Una vez dentro de Resend, ve a **API Keys**
2. Haz clic en **Create API Key**
3. Dale un nombre (ej: "Synapse Production")
4. Copia la API Key (solo se muestra una vez)

---

## 📝 Paso 3: Configurar variables de entorno

Agrega las siguientes variables a tu archivo `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_TESTING_EMAIL=infoamnesiarental@gmail.com  # Opcional: tu email para testing
```

**Importante:** 
- No commitees este archivo a Git
- La API Key debe mantenerse secreta
- `RESEND_TESTING_EMAIL` es opcional, por defecto usa `infoamnesiarental@gmail.com`

---

## 🌐 Paso 4: Configurar dominio (Opcional pero recomendado)

### Para desarrollo (usando dominio de Resend):
- Puedes usar el dominio por defecto de Resend: `onboarding@resend.dev`
- Esto funciona solo para desarrollo

### Para producción:
1. Ve a **Domains** en Resend
2. Agrega tu dominio (ej: `synapse.com`)
3. Agrega los registros DNS que Resend te proporciona:
   - Registro SPF
   - Registro DKIM
   - Registro DMARC (opcional)
4. Espera a que se verifique (puede tardar hasta 24 horas)

---

## 📧 Paso 5: Actualizar remitente en el código

Una vez que tengas tu dominio verificado, actualiza el remitente en:

`app/api/send-tickets-email/route.ts`

```typescript
from: 'Synapse <noreply@tudominio.com>', // Cambiar por tu dominio
```

---

## ✅ Paso 6: Verificar funcionamiento

1. Realiza una compra de prueba
2. Verifica que el email llegue a la bandeja de entrada
3. Revisa los logs en Resend Dashboard para ver el estado de los envíos

---

## 🐛 Troubleshooting

### Error: "You can only send testing emails to your own email address"
**✅ SOLUCIONADO:** El código ahora detecta automáticamente si estás en desarrollo y redirige todos los emails a tu email de testing.

- En desarrollo (`NODE_ENV=development`), todos los emails se envían a `RESEND_TESTING_EMAIL` o `infoamnesiarental@gmail.com` por defecto
- El email incluye una nota indicando el destinatario original
- En producción, se envían a los emails reales

### Error: "Invalid API Key"
- Verifica que la API Key esté correcta en `.env.local`
- Asegúrate de que no haya espacios extra

### Error: "Domain not verified"
- Para desarrollo, usa `onboarding@resend.dev` (ya configurado)
- Para producción, verifica tu dominio en Resend y cambia el `from` en el código

### Los emails no llegan
- Revisa la carpeta de spam
- Verifica los logs en Resend Dashboard
- Asegúrate de que el dominio esté verificado (solo para producción)

### Error en la consola del servidor
- Verifica que `RESEND_API_KEY` esté configurada
- Revisa que el servidor se haya reiniciado después de agregar la variable

---

## 📊 Límites de Resend (Plan Gratuito)

- **100 emails/día**
- **3,000 emails/mes**
- Perfecto para desarrollo y MVP inicial

Para producción, considera el plan de pago según tu volumen.

---

## 🔒 Seguridad

- ✅ Nunca commitees la API Key
- ✅ Usa variables de entorno
- ✅ Rota las API Keys periódicamente
- ✅ Monitorea el uso en Resend Dashboard

---

**Última actualización:** 2025-01-27
