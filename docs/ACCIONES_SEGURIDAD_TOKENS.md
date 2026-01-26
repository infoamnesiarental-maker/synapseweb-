# 🔒 Acciones de Seguridad Requeridas - Tokens Expuestos

**Fecha:** 2025-01-27  
**Urgencia:** 🔴 CRÍTICA

---

## ⚠️ PROBLEMA DETECTADO

GitGuardian detectó que se expusieron tokens de acceso en el repositorio de GitHub:

1. **Token de Mercado Pago** - Expuesto en commit `73aa41a`
2. **Token de Supabase** - Expuesto en documentación

---

## ✅ ACCIONES INMEDIATAS REQUERIDAS

### 1. **ROTAR TOKEN DE MERCADO PAGO** (URGENTE)

El token `APP_USR-7447923468298505-012511-dbda0d5f1982d3f629539d9057e1cd42-3007590479` está comprometido.

**Pasos:**

1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Ve a **Tus integraciones** > **Credenciales**
3. **REVOCA** el token actual
4. **CREA** un nuevo Access Token
5. **ACTUALIZA** el token en:
   - Variables de entorno locales (`.env.local`)
   - Variables de entorno en Vercel
   - Cualquier otro lugar donde lo uses

**⚠️ IMPORTANTE:** El token anterior ya no es seguro y debe ser revocado inmediatamente.

---

### 2. **ROTAR TOKEN DE SUPABASE** (RECOMENDADO)

El token `sbp_e4c8fb15a4e0364107c179a93ea14cd34abf9c3e` también fue expuesto.

**Pasos:**

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard/account/tokens)
2. **REVOCA** el token actual
3. **CREA** un nuevo Personal Access Token
4. **ACTUALIZA** el token en:
   - Configuración de MCP en Cursor
   - Cualquier otro lugar donde lo uses

---

### 3. **LIMPIAR HISTORIAL DE GIT** (OPCIONAL PERO RECOMENDADO)

Aunque ya eliminamos los tokens de los archivos actuales, **siguen estando en el historial de Git**.

**Opción A: Usar BFG Repo-Cleaner (Recomendado)**

```bash
# Instalar BFG (si no lo tienes)
# Descargar desde: https://rtyley.github.io/bfg-repo-cleaner/

# Limpiar tokens
java -jar bfg.jar --replace-text tokens.txt

# Force push (CUIDADO: esto reescribe el historial)
git push origin --force --all
```

**Opción B: Crear un nuevo repositorio (Más simple)**

Si el repositorio es nuevo y no hay muchos colaboradores, considera crear un nuevo repositorio y migrar el código sin el historial comprometido.

---

## ✅ FIXES APLICADOS

- ✅ Tokens eliminados de archivos de documentación
- ✅ Reemplazados con placeholders seguros
- ✅ Workflow duplicado eliminado

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] Token de Mercado Pago revocado
- [ ] Nuevo token de Mercado Pago creado
- [ ] Token actualizado en `.env.local`
- [ ] Token actualizado en Vercel
- [ ] Token de Supabase revocado (recomendado)
- [ ] Nuevo token de Supabase creado
- [ ] Token de Supabase actualizado en MCP
- [ ] Historial de Git limpiado (opcional)

---

## 🔍 VERIFICACIÓN

Después de rotar los tokens, verifica que:

1. ✅ La aplicación sigue funcionando correctamente
2. ✅ Los pagos de Mercado Pago funcionan
3. ✅ MCP sigue conectado a Supabase
4. ✅ No hay errores en los logs

---

## 📚 RECURSOS

- [GitGuardian - Remediate Exposed Secrets](https://docs.gitguardian.com/internal-repositories-monitoring/integrations/github/secret-scanning/remediate-exposed-secrets)
- [Mercado Pago - Credenciales](https://www.mercadopago.com.ar/developers/panel/credentials)
- [Supabase - Personal Access Tokens](https://supabase.com/dashboard/account/tokens)

---

**⚠️ RECUERDA:** Los tokens expuestos deben ser rotados INMEDIATAMENTE. No esperes.
