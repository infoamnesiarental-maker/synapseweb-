# MCP Server para Mercado Pago

Servidor MCP (Model Context Protocol) personalizado para integrar Mercado Pago con Cursor AI.

## 🚀 Instalación Rápida

```bash
# Instalar dependencias
npm install

# Compilar
npm run build
```

## 📋 Configuración

Ver la guía completa en: `../docs/GUIA_CONFIGURACION_MCP_MERCADOPAGO.md`

O ejecuta el script automático:

```powershell
.\scripts\setup-mcp-mercadopago.ps1
```

## 🛠️ Herramientas Disponibles

- `verify_credentials` - Verifica credenciales de Mercado Pago
- `create_test_preference` - Crea preferencias de prueba
- `get_preference_info` - Obtiene información de preferencias
- `get_payment_info` - Obtiene información de pagos
- `check_sandbox_status` - Verifica estado de sandbox
- `diagnose_integration` - Diagnóstico completo de la integración

## 🔧 Desarrollo

```bash
# Modo desarrollo (con hot reload)
npm run dev

# Compilar
npm run build

# Ejecutar
npm start
```

## 📝 Variables de Entorno

- `MERCADOPAGO_ACCESS_TOKEN` - Access Token de Mercado Pago (requerido)

## 🔒 Seguridad

⚠️ **IMPORTANTE:** No compartas tu Access Token. Se almacena en la configuración de Cursor localmente.
