# ⚡ MCP + Supabase - Inicio Rápido

## 🎯 Configuración en 3 Pasos

### Paso 1: Obtener Token de Supabase

1. Ve a: https://supabase.com/dashboard/account/tokens
2. Crea un nuevo **Personal Access Token**
3. **Copia el token** (solo se muestra una vez)

### Paso 2: Configurar en Cursor

1. Abre la configuración de MCP en Cursor:
   - `File > Preferences > Settings` → Busca "MCP"
   - O edita directamente: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

2. Agrega esta configuración:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "TU_SUPABASE_URL_AQUI",
        "SUPABASE_ACCESS_TOKEN": "TU_TOKEN_AQUI"
      }
    }
  }
}
```

3. **Reemplaza:**
   - `TU_SUPABASE_URL_AQUI` → Tu URL de Supabase (de `.env`: `NEXT_PUBLIC_SUPABASE_URL`)
   - `TU_TOKEN_AQUI` → El token que copiaste en el Paso 1

### Paso 3: Reiniciar Cursor

1. Cierra completamente Cursor
2. Vuelve a abrirlo
3. ¡Listo! Ahora puedes preguntar a la AI sobre tu base de datos

---

## 🧪 Prueba Rápida

Pregunta a la AI:
- "¿Cuál es la estructura de la tabla `events`?"
- "¿Cuántas tablas hay en mi base de datos?"
- "Muéstrame las relaciones entre `events` y `ticket_types`"

---

## 📖 Documentación Completa

Ver: `docs/GUIA_CONFIGURACION_MCP_SUPABASE.md` para más detalles.
