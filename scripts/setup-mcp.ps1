# Script de Configuracion MCP para Supabase en Windows
# Ejecutar desde PowerShell: .\scripts\setup-mcp.ps1

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== Configuracion de MCP + Supabase para Cursor ===" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "[ERROR] Este script debe ejecutarse desde la raiz del proyecto" -ForegroundColor Red
    exit 1
}

# 1. Verificar variables de entorno
Write-Host "[PASO 1] Verificando variables de entorno..." -ForegroundColor Yellow

$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "[ADVERTENCIA] No se encontro .env.local" -ForegroundColor Yellow
    Write-Host "   Por favor, crea el archivo .env.local con:" -ForegroundColor Gray
    Write-Host "   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co" -ForegroundColor Gray
    Write-Host "   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key" -ForegroundColor Gray
    Write-Host ""
}

# 2. Obtener URL de Supabase
Write-Host "[PASO 2] Obteniendo URL de Supabase..." -ForegroundColor Yellow

$supabaseUrl = $null
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "NEXT_PUBLIC_SUPABASE_URL=(.+)") {
        $supabaseUrl = $matches[1].Trim()
        Write-Host "   [OK] URL encontrada: $supabaseUrl" -ForegroundColor Green
    }
}

if (-not $supabaseUrl) {
    Write-Host "   [ADVERTENCIA] No se encontro NEXT_PUBLIC_SUPABASE_URL en .env.local" -ForegroundColor Yellow
    $supabaseUrl = Read-Host "   Por favor, ingresa tu URL de Supabase"
}

# 3. Solicitar token de acceso
Write-Host ""
Write-Host "[PASO 3] Token de Acceso Personal de Supabase" -ForegroundColor Yellow
Write-Host "   1. Ve a: https://supabase.com/dashboard/account/tokens" -ForegroundColor Gray
Write-Host "   2. Crea un nuevo Personal Access Token" -ForegroundColor Gray
Write-Host "   3. Copia el token (solo se muestra una vez)" -ForegroundColor Gray
Write-Host ""
$accessToken = Read-Host "   Ingresa tu Personal Access Token" -AsSecureString
$accessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($accessToken)
)

# 4. Determinar ubicacion del archivo de configuracion
Write-Host ""
Write-Host "[PASO 4] Ubicando archivo de configuracion de Cursor..." -ForegroundColor Yellow

$cursorConfigPath = "$env:APPDATA\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json"
$configDir = Split-Path $cursorConfigPath -Parent

if (-not (Test-Path $configDir)) {
    Write-Host "   [ADVERTENCIA] Directorio no encontrado. Creando..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

# 5. Crear o actualizar configuracion
Write-Host ""
Write-Host "[PASO 5] Creando configuracion MCP..." -ForegroundColor Yellow

$mcpConfig = @{
    mcpServers = @{
        supabase = @{
            command = "npx"
            args = @(
                "-y",
                "@supabase/mcp-server-supabase"
            )
            env = @{
                SUPABASE_URL = $supabaseUrl
                SUPABASE_ACCESS_TOKEN = $accessTokenPlain
            }
        }
    }
}

# Leer configuracion existente si existe
$existingConfig = @{}
if (Test-Path $cursorConfigPath) {
    try {
        $existingContent = Get-Content $cursorConfigPath -Raw | ConvertFrom-Json
        if ($existingContent.mcpServers) {
            $existingConfig = $existingContent.mcpServers
            Write-Host "   [OK] Configuracion existente encontrada" -ForegroundColor Green
        }
    } catch {
        Write-Host "   [ADVERTENCIA] Error al leer configuracion existente. Se creara una nueva." -ForegroundColor Yellow
    }
}

# Fusionar configuraciones
$mergedConfig = @{
    mcpServers = $existingConfig
}
$mergedConfig.mcpServers.supabase = $mcpConfig.mcpServers.supabase

# Convertir a JSON
$jsonConfig = $mergedConfig | ConvertTo-Json -Depth 10

# Guardar archivo
try {
    $jsonConfig | Out-File -FilePath $cursorConfigPath -Encoding UTF8 -Force
    Write-Host "   [OK] Configuracion guardada en:" -ForegroundColor Green
    Write-Host "      $cursorConfigPath" -ForegroundColor Gray
} catch {
    Write-Host "   [ERROR] Error al guardar configuracion: $_" -ForegroundColor Red
    exit 1
}

# 6. Resumen
Write-Host ""
Write-Host "[OK] Configuracion completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Cierra completamente Cursor" -ForegroundColor White
Write-Host "   2. Abre Cursor nuevamente" -ForegroundColor White
Write-Host "   3. Prueba preguntando: 'Cual es la estructura de la tabla events?'" -ForegroundColor White
Write-Host ""
Write-Host "Seguridad:" -ForegroundColor Yellow
Write-Host "   - El token esta guardado en el archivo de configuracion de Cursor" -ForegroundColor Gray
Write-Host "   - No compartas este token con nadie" -ForegroundColor Gray
Write-Host "   - Si sospechas que fue comprometido, revocalo en Supabase" -ForegroundColor Gray
Write-Host ""
