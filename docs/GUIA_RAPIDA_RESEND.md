# 🚀 Guía Rápida - Configurar Resend en 5 minutos

Esta guía te ayudará a configurar Resend paso a paso para que los emails funcionen.

---

## 📋 Paso 1: Copiar tu API Key

1. En la página de Resend que estás viendo, busca el campo con la API Key (los puntos)
2. Haz clic en el **icono del ojo** 👁️ para ver la clave
3. Haz clic en el **icono de copiar** 📋 para copiarla
4. **Guarda esta clave**, la necesitarás en el siguiente paso

---

## 📝 Paso 2: Crear archivo .env.local

1. En la raíz de tu proyecto (`c:\synapseweb`), crea un archivo llamado `.env.local`
2. Si ya existe, ábrelo
3. Agrega esta línea (reemplaza con tu API Key real):

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Ejemplo:**
```env
RESEND_API_KEY=re_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

⚠️ **IMPORTANTE:** 
- No pongas espacios antes o después del `=`
- No pongas comillas alrededor de la clave
- La clave debe empezar con `re_`

---

## 🔄 Paso 3: Reiniciar el servidor

1. Si tu servidor está corriendo, detenlo (Ctrl+C en la terminal)
2. Inicia el servidor nuevamente:

```bash
npm run dev
```

**¿Por qué?** Next.js solo lee las variables de entorno cuando inicia, así que necesitas reiniciarlo.

---

## ✅ Paso 4: Verificar que funciona

1. Ve a tu aplicación: `http://localhost:3000`
2. Realiza una compra de prueba (o usa una compra existente)
3. Después de completar la compra, verifica:
   - El email debe llegar a la bandeja de entrada
   - Si no llega, revisa la carpeta de spam
   - Revisa la consola del servidor por errores

---

## 🐛 Si no funciona

### Error: "Invalid API Key"
- Verifica que copiaste la clave completa
- Asegúrate de que no haya espacios en `.env.local`
- Verifica que el archivo se llama exactamente `.env.local` (no `.env` ni `.env.local.txt`)

### Error: "Domain not verified"
- Para desarrollo, esto está bien, usa `onboarding@resend.dev` (ya está configurado)
- Para producción, necesitarás verificar tu dominio

### El email no llega
1. Revisa la carpeta de spam
2. Verifica en Resend Dashboard → Emails si se envió
3. Revisa la consola del servidor (terminal donde corre `npm run dev`)

### No veo el archivo .env.local
- Asegúrate de estar en la raíz del proyecto (`c:\synapseweb`)
- El archivo puede estar oculto, en Windows:
  - Ve a "Ver" → "Elementos ocultos"
  - O crea el archivo desde la terminal: `echo. > .env.local`

---

## 📧 Configuración del remitente (Opcional)

Por ahora, el código usa `onboarding@resend.dev` que funciona para desarrollo.

Si quieres cambiar el remitente, edita:

`app/api/send-tickets-email/route.ts`

Busca esta línea (alrededor de la línea 100):

```typescript
from: 'Synapse <noreply@synapse.com>',
```

Y cámbiala por:

```typescript
from: 'Synapse <onboarding@resend.dev>', // Para desarrollo
```

O si tienes un dominio verificado:

```typescript
from: 'Synapse <noreply@tudominio.com>', // Para producción
```

---

## ✅ Checklist

Marca cada paso cuando lo completes:

- [ ] Copié mi API Key de Resend
- [ ] Creé el archivo `.env.local` en la raíz del proyecto
- [ ] Agregué `RESEND_API_KEY=mi_clave_aqui` al archivo
- [ ] Reinicié el servidor (`npm run dev`)
- [ ] Realicé una compra de prueba
- [ ] Recibí el email con los tickets

---

## 🎯 Siguiente paso

Una vez que funcione, puedes:
1. Verificar tu dominio en Resend (para producción)
2. Personalizar el template de email
3. Agregar adjuntos PDF (mejora futura)

---

**¿Necesitas ayuda?** Revisa `docs/CONFIGURACION_EMAIL.md` para más detalles.
