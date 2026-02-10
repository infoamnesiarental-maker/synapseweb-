# Configuración de Emails de Confirmación - Supabase

## 🎯 Problema

Cuando un usuario se registra, **no le llega el email de confirmación** de la cuenta.

---

## ✅ Solución: Habilitar Emails de Confirmación en Supabase

### Paso 1: Ir al Panel de Supabase

1. Ir a: https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a: **Authentication** → **Settings** (o **Configuración**)

---

### Paso 2: Habilitar Email Confirmation

**Ruta en Supabase:**
```
Authentication → Settings → Email Auth
```

**Qué buscar:**
- **"Enable email confirmations"** (Habilitar confirmaciones por email)
- **"Confirm email"** toggle

**Pasos:**
1. Buscar la sección **"Email Auth"** o **"Email Authentication"**
2. Activar el toggle **"Enable email confirmations"** ✅
3. Guardar los cambios

---

### Paso 3: Configurar URL de Redirección

**Importante:** Después de confirmar el email, el usuario debe ser redirigido a tu app.

**Ruta en Supabase:**
```
Authentication → URL Configuration → Redirect URLs
```

**Agregar URLs permitidas:**
- `http://localhost:3000/**` (para desarrollo)
- `https://tu-app.vercel.app/**` (para producción)
- `https://tu-dominio.com/**` (si tenés dominio propio)

**Ejemplo:**
```
http://localhost:3000/auth/callback
https://tu-app.vercel.app/auth/callback
```

---

### Paso 4: Configurar Email Templates (Opcional)

**Ruta en Supabase:**
```
Authentication → Email Templates
```

**Templates disponibles:**
- **Confirm signup** (Confirmar registro)
- **Magic Link** (Link mágico)
- **Change Email Address** (Cambiar email)
- **Reset Password** (Restablecer contraseña)

**Qué hacer:**
1. Seleccionar **"Confirm signup"**
2. Personalizar el template si querés (opcional)
3. Verificar que el **Subject** (Asunto) sea claro
4. Verificar que el **Body** (Cuerpo) incluya el link de confirmación

**Template por defecto (debería funcionar):**
```
Subject: Confirm your signup

Click the link below to confirm your signup:
{{ .ConfirmationURL }}
```

---

### Paso 5: Configurar SMTP (Recomendado para Producción)

**⚠️ IMPORTANTE:** Por defecto, Supabase usa su propio servicio de email (limitado a 3 emails/hora en el plan gratuito). Para producción, es recomendable configurar SMTP personalizado.

**Ruta en Supabase:**
```
Settings → Auth → SMTP Settings
```

**Opciones de SMTP:**
1. **Resend** (Recomendado - ya lo usás para tickets)
2. **SendGrid**
3. **Mailgun**
4. **SMTP personalizado** (Gmail, Outlook, etc.)

---

#### Opción A: Configurar Resend para Auth Emails

**Ventajas:**
- Ya tenés Resend configurado para tickets
- Límite más alto que el SMTP por defecto
- Mejor deliverability

**Pasos:**
1. Ir a: https://resend.com/api-keys
2. Crear o usar tu API key existente
3. En Supabase: **Settings → Auth → SMTP Settings**
4. Seleccionar **"Custom SMTP"**
5. Configurar:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) o `587` (TLS)
   - **Username:** `resend`
   - **Password:** Tu API key de Resend
   - **Sender email:** El email verificado en Resend (ej: `noreply@tudominio.com`)
   - **Sender name:** `Synapse` (o el nombre que prefieras)

**Verificar en Resend:**
- El dominio debe estar verificado en Resend
- O usar el dominio por defecto de Resend (`onboarding@resend.dev`)

---

#### Opción B: Usar SMTP por Defecto (Solo para Testing)

**Cuándo usar:**
- Solo para desarrollo/testing
- Límite: 3 emails/hora (plan gratuito)

**Qué hacer:**
- No necesitás configurar nada
- Supabase envía los emails automáticamente
- Verificar que **"Enable email confirmations"** esté activado

---

### Paso 6: Verificar Configuración

**En Supabase Dashboard:**
1. Ir a: **Authentication → Users**
2. Crear un usuario de prueba manualmente
3. Verificar que se envía el email

**O probar desde la app:**
1. Ir a: `/register`
2. Registrarse con un email real
3. Verificar la bandeja de entrada (y spam)

---

## 🔍 Troubleshooting

### Problema 1: No llegan los emails

**Posibles causas:**
1. **Email confirmations deshabilitado** → Habilitar en Auth Settings
2. **Emails en spam** → Revisar carpeta de spam
3. **Límite de emails alcanzado** → Configurar SMTP personalizado
4. **URL de redirección no configurada** → Agregar URLs en Redirect URLs

**Solución:**
1. Verificar que **"Enable email confirmations"** esté activado ✅
2. Revisar carpeta de spam
3. Configurar SMTP personalizado (Resend recomendado)
4. Verificar logs en Supabase: **Logs → Auth Logs**

---

### Problema 2: El link de confirmación no funciona

**Posibles causas:**
1. **URL de redirección no configurada** → Agregar en Redirect URLs
2. **Link expirado** → Los links expiran después de cierto tiempo
3. **Dominio no verificado** → Verificar dominio en Resend/SMTP

**Solución:**
1. Agregar URL de redirección en Supabase
2. Verificar que el link no haya expirado
3. Si expiró, el usuario puede pedir un nuevo email de confirmación

---

### Problema 3: Error al enviar email

**Qué verificar:**
1. **Logs de Supabase:**
   - Ir a: **Logs → Auth Logs**
   - Buscar errores relacionados con email

2. **Configuración SMTP:**
   - Verificar que las credenciales sean correctas
   - Verificar que el puerto sea correcto (465 o 587)

3. **Límites de Resend:**
   - Verificar que no hayas alcanzado el límite
   - Plan gratuito: 100 emails/día

**Solución:**
1. Revisar logs de Supabase
2. Verificar credenciales SMTP
3. Si usás Resend, verificar límites en dashboard

---

## 📋 Checklist de Configuración

Antes de probar, verificá:

- [ ] **"Enable email confirmations"** está activado en Supabase
- [ ] **Redirect URLs** están configuradas (localhost y producción)
- [ ] **SMTP personalizado** configurado (Recomendado: Resend)
- [ ] **Email templates** personalizados (opcional)
- [ ] **Dominio verificado** en Resend (si usás Resend)
- [ ] **Variables de entorno** configuradas en Vercel (si aplica)

---

## 🧪 Test Rápido

**Pasos para probar:**
1. Ir a: `/register`
2. Completar el formulario con un email real
3. Hacer clic en "Crear Cuenta"
4. Verificar que aparece el mensaje: "Te hemos enviado un email de confirmación"
5. Revisar la bandeja de entrada (y spam)
6. Hacer clic en el link de confirmación
7. Verificar que te redirige a la app y la cuenta queda confirmada

**Qué deberías ver:**
- ✅ Email en la bandeja de entrada (o spam)
- ✅ Link de confirmación funcional
- ✅ Redirección a la app después de confirmar
- ✅ Usuario puede iniciar sesión después de confirmar

---

## 🔗 URLs Importantes

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Auth Settings:** https://supabase.com/dashboard/project/[PROJECT_ID]/auth/url-configuration
- **Email Templates:** https://supabase.com/dashboard/project/[PROJECT_ID]/auth/templates
- **SMTP Settings:** https://supabase.com/dashboard/project/[PROJECT_ID]/settings/auth
- **Resend Dashboard:** https://resend.com/emails

---

## 📝 Notas Importantes

1. **Plan Gratuito de Supabase:**
   - Límite: 3 emails/hora con SMTP por defecto
   - Para producción, configurá SMTP personalizado

2. **Resend:**
   - Plan gratuito: 100 emails/día
   - Mejor deliverability que SMTP por defecto
   - Ya lo usás para tickets, podés usarlo también para auth

3. **Seguridad:**
   - Los links de confirmación expiran después de cierto tiempo
   - El usuario puede pedir un nuevo email si expiró

4. **Testing:**
   - Usá emails reales para probar (no emails temporales)
   - Revisá la carpeta de spam
   - Verificá los logs de Supabase si hay problemas

---

## ✅ Siguiente Paso

Una vez configurado, probá el registro completo:
1. Registrarse
2. Confirmar email
3. Iniciar sesión

Si todo funciona, podés continuar con los tests de Mercado Pago.
