# 🔍 Cómo Encontrar la Configuración de Git en Vercel

## 📍 Ubicación Exacta

### Paso a Paso:

1. **Ve al Dashboard de Vercel:**
   - https://vercel.com/dashboard

2. **Selecciona tu proyecto:**
   - Click en **"synapseweb-"** (o el nombre de tu proyecto)

3. **Ve a Settings:**
   - En el **menú superior horizontal**, busca **"Settings"** (está al final)
   - Menú completo: `Overview | Deployments | Analytics | Speed Insights | Logs | ... | Settings`
   - **Click en "Settings"**

4. **Busca "Git" en el menú lateral:**
   - Una vez en Settings, verás un **menú lateral izquierdo**
   - Busca la opción **"Git"** o **"Repository"**
   - **Click en "Git"**

5. **Ahí encontrarás:**
   - ✅ Configuración del repositorio conectado
   - ✅ **"Deployment Protection"** o **"Wait for CI"**
   - ✅ Opciones de auto-deploy

---

## 🎯 Ruta Visual

```
Vercel Dashboard
  └── Tu Proyecto (synapseweb-)
      └── Settings (menú superior)
          └── Git (menú lateral izquierdo)
              └── Deployment Protection
                  └── Wait for CI ✅
```

---

## 🔍 Si No Encuentras "Git"

### Alternativa 1: Buscar "Deployment Protection"
- En Settings, busca directamente **"Deployment Protection"**
- Puede estar en una sección diferente según tu plan de Vercel

### Alternativa 2: Verificar en "Repository"
- Algunas veces está en **"Repository"** en lugar de "Git"
- Mismo menú lateral izquierdo en Settings

### Alternativa 3: Usar vercel.json (Recomendado)
- Si no encuentras la opción en el dashboard
- Usa el archivo `vercel.json` que ya creamos
- Vercel lo detectará automáticamente

---

## ✅ Verificación Rápida

**Pregunta:** ¿Ves un menú lateral izquierdo en Settings con opciones como:
- General
- Git / Repository
- Environment Variables
- Domains
- etc.

**Si SÍ:** Estás en el lugar correcto, busca "Git" ahí.

**Si NO:** Puede que estés en una vista diferente, intenta hacer click en "Settings" de nuevo.

---

## 📸 Ubicación en la Imagen que Compartiste

En tu screenshot del dashboard, veo:
- Menú superior con: `Overview | Deployments | Analytics | ... | Settings`
- **Click en "Settings"** (al final del menú)
- Luego busca "Git" en el menú lateral izquierdo

---

## 💡 Tip

Si tienes problemas encontrándolo, también puedes:
1. Ir directamente a: `https://vercel.com/[tu-usuario]/synapseweb-/settings/git`
2. O usar el archivo `vercel.json` que ya configuramos (funciona igual)
