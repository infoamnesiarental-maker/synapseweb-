# 🚀 Guía de Configuración MCP con Supabase

**Objetivo:** Conectar Supabase con MCP (Model Context Protocol) para que la AI tenga acceso a información real de tu base de datos, esquemas, datos e infraestructura, reduciendo significativamente las alucinaciones.

**Fecha:** 2025-01-27

---

## 📋 ¿Qué es MCP y por qué usarlo?

**MCP (Model Context Protocol)** es un protocolo desarrollado por Anthropic que permite que los modelos de lenguaje accedan a contextos externos de manera estructurada. Al conectar Supabase con MCP:

✅ **Acceso a esquemas reales** - La AI conoce la estructura exacta de tus tablas  
✅ **Datos en tiempo real** - Puede consultar información actual de tu base de datos  
✅ **Menos alucinaciones** - Respuestas basadas en datos reales, no en conocimiento entrenado  
✅ **Mejor asistencia** - La AI puede ayudarte con consultas SQL específicas de tu proyecto  

---

## 🎯 Opción 1: Servidor MCP Oficial de Supabase (Recomendado)

### Requisitos Previos

1. **Token de acceso personal de Supabase**
   - Ve a: https://supabase.com/dashboard/account/tokens
   - Crea un nuevo token de acceso personal
   - **Guárdalo de forma segura** (lo necesitarás para la configuración)

2. **URL de tu proyecto Supabase**
   - La tienes en tu archivo `.env` como `NEXT_PUBLIC_SUPABASE_URL`
   - Ejemplo: `https://xxxxx.supabase.co`

### Configuración en Cursor

1. **Abre la configuración de MCP en Cursor:**
   - Ve a: `File > Preferences > Settings` (o `Ctrl+,`)
   - Busca "MCP" o "Model Context Protocol"
   - O edita directamente el archivo de configuración

2. **Ubicación del archivo de configuración:**
   - **Windows:** `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
   - **macOS:** `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - **Linux:** `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

3. **Configura el servidor MCP de Supabase:**

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
        "SUPABASE_URL": "https://tu-proyecto.supabase.co",
        "SUPABASE_ACCESS_TOKEN": "tu-token-de-acceso-aqui"
      }
    }
  }
}
```

### Variables de Entorno Necesarias

```bash
# En tu archivo .env.local o en la configuración de MCP
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ACCESS_TOKEN=tu-token-de-acceso-personal
```

### Verificación

Una vez configurado, la AI podrá:
- Consultar el esquema de tus tablas
- Ejecutar consultas SQL (con precaución)
- Obtener información sobre la estructura de tu base de datos
- Responder preguntas específicas sobre tu infraestructura

**Ejemplo de uso:**
- "¿Cuál es la estructura de la tabla `events`?"
- "¿Cuántos eventos publicados hay actualmente?"
- "Muéstrame las relaciones entre las tablas"

---

## 🛠️ Opción 2: Servidor MCP Personalizado (Avanzado)

Si necesitas más control o funcionalidades específicas, puedes crear tu propio servidor MCP.

### Estructura del Proyecto

```
synapseweb/
├── mcp-server/
│   ├── package.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── supabase-client.ts
│   │   └── tools/
│   │       ├── get-schema.ts
│   │       ├── query-database.ts
│   │       └── get-table-info.ts
│   └── tsconfig.json
```

### Implementación Básica

#### 1. Crear el servidor MCP

```typescript
// mcp-server/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const server = new Server({
  name: 'supabase-synapse-mcp',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Listar herramientas disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_table_schema',
      description: 'Obtiene el esquema completo de una tabla de Supabase',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Nombre de la tabla',
          },
        },
        required: ['tableName'],
      },
    },
    {
      name: 'query_database',
      description: 'Ejecuta una consulta SQL en la base de datos (solo SELECT)',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Consulta SQL (solo SELECT permitido)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'list_tables',
      description: 'Lista todas las tablas disponibles en la base de datos',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

// Manejar llamadas a herramientas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_table_schema': {
        const { tableName } = args as { tableName: string };
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (error) throw error;
        
        // Obtener información del esquema desde información_schema
        const schemaQuery = `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                table: tableName,
                columns: schemaQuery, // Implementar consulta real
              }, null, 2),
            },
          ],
        };
      }

      case 'list_tables': {
        const { data, error } = await supabase.rpc('list_tables');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data || [], null, 2),
            },
          ],
        };
      }

      case 'query_database': {
        const { query } = args as { query: string };
        
        // Validar que solo sea SELECT
        if (!query.trim().toUpperCase().startsWith('SELECT')) {
          throw new Error('Solo se permiten consultas SELECT');
        }
        
        const { data, error } = await supabase.rpc('execute_query', { 
          query_string: query 
        });
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Iniciar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Servidor MCP de Supabase iniciado');
}

main().catch(console.error);
```

#### 2. Configurar package.json

```json
{
  "name": "supabase-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "@supabase/supabase-js": "^2.86.2"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

#### 3. Configurar en Cursor

```json
{
  "mcpServers": {
    "supabase-synapse": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://tu-proyecto.supabase.co",
        "SUPABASE_ANON_KEY": "tu-anon-key"
      }
    }
  }
}
```

---

## 🔒 Consideraciones de Seguridad

### ⚠️ Importante

1. **Nunca expongas tu `service_role` key** - Solo usa `anon_key` o un token de acceso personal
2. **Valida todas las consultas** - El servidor MCP debe validar que solo se ejecuten consultas SELECT
3. **Usa RLS (Row Level Security)** - Asegúrate de que las políticas RLS estén configuradas correctamente
4. **Limita permisos** - El token de acceso debe tener solo los permisos necesarios

### Mejores Prácticas

- ✅ Usa tokens de acceso personal con permisos limitados
- ✅ Implementa validación de consultas SQL
- ✅ Solo permite operaciones de lectura (SELECT)
- ✅ Usa variables de entorno para credenciales
- ✅ Revisa regularmente los logs de acceso

---

## 📊 Funcionalidades Disponibles

Una vez configurado, la AI podrá:

### 1. Consultar Esquemas
- Estructura de tablas
- Tipos de datos
- Relaciones entre tablas
- Índices y constraints

### 2. Obtener Información de Infraestructura
- Tablas disponibles
- Políticas RLS
- Funciones y triggers
- Extensiones habilitadas

### 3. Consultar Datos (con precaución)
- Conteos y estadísticas
- Información agregada
- Datos de ejemplo (limitados)

---

## 🧪 Prueba la Configuración

Una vez configurado, prueba con estas preguntas:

1. "¿Cuál es la estructura de la tabla `events`?"
2. "¿Cuántas tablas hay en la base de datos?"
3. "Muéstrame las relaciones entre `events` y `ticket_types`"
4. "¿Qué políticas RLS tiene la tabla `purchases`?"

---

## 📚 Recursos Adicionales

- [Documentación oficial de MCP](https://modelcontextprotocol.io/)
- [Servidor MCP de Supabase](https://github.com/supabase/mcp-server-supabase)
- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Cursor MCP](https://docs.cursor.com/guides/tutorials/building-mcp-server)

---

## 🐛 Solución de Problemas

### Error: "Cannot find module"
- Asegúrate de que `npx` esté disponible en tu PATH
- Verifica que las dependencias estén instaladas

### Error: "Invalid credentials"
- Verifica que `SUPABASE_URL` y `SUPABASE_ACCESS_TOKEN` sean correctos
- Asegúrate de que el token no haya expirado

### La AI no puede acceder a la base de datos
- Verifica que el servidor MCP esté corriendo
- Revisa los logs de Cursor
- Asegúrate de que la configuración JSON sea válida

---

## ✅ Checklist de Configuración

- [ ] Token de acceso personal de Supabase creado
- [ ] URL de Supabase obtenida
- [ ] Archivo de configuración MCP editado
- [ ] Variables de entorno configuradas
- [ ] Servidor MCP probado con consultas básicas
- [ ] Seguridad verificada (solo SELECT permitido)
- [ ] RLS configurado correctamente

---

**¡Listo!** Ahora tu AI tiene acceso a información real de tu base de datos Supabase, reduciendo significativamente las alucinaciones y mejorando la calidad de las respuestas.
