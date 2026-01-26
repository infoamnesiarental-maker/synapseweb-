# Script de Verificación de Configuración MCP
# Ejecutar desde PowerShell: .\scripts\verify-mcp.ps1

Write-Host "🔍 Verificando configuración MCP + Supabase" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# 1. Verificar archivo de configuración
Write-Host "📋 Verificando archivo de configuración..." -ForegroundColor Yellow

$cursorConfigPath = "$env:APPDATA\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json"

if (-not (Test-Path $cursorConfigPath)) {
    $errors += "❌ Archivo de configuración no encontrado: $cursorConfigPath"
    Write-Host $errors[-1] -ForegroundColor Red
} else {
    Write-Host "   ✅ Archivo de configuración encontrado" -ForegroundColor Green
    
    try {
        $config = Get-Content $cursorConfigPath -Raw | ConvertFrom-Json
        
        if (-not $config.mcpServers) {
            $errors += "❌ No se encontró 'mcpServers' en la configuración"
            Write-Host $errors[-1] -ForegroundColor Red
        } elseif (-not $config.mcpServers.supabase) {
            $errors += "❌ No se encontró configuración de 'supabase' en mcpServers"
            Write-Host $errors[-1] -ForegroundColor Red
        } else {
            Write-Host "   ✅ Configuración de Supabase encontrada" -ForegroundColor Green
            
            $supabaseConfig = $config.mcpServers.supabase
            
            # Verificar command
            if ($supabaseConfig.command -ne "npx") {
                $warnings += "⚠️  Command debería ser 'npx', actual: $($supabaseConfig.command)"
                Write-Host $warnings[-1] -ForegroundColor Yellow
            } else {
                Write-Host "   ✅ Command correcto: npx" -ForegroundColor Green
            }
            
            # Verificar args
            if (-not $supabaseConfig.args -or $supabaseConfig.args.Count -eq 0) {
                $errors += "❌ No se encontraron 'args' en la configuración"
                Write-Host $errors[-1] -ForegroundColor Red
            } else {
                Write-Host "   ✅ Args configurados correctamente" -ForegroundColor Green
            }
            
            # Verificar variables de entorno
            if (-not $supabaseConfig.env) {
                $errors += "❌ No se encontró 'env' en la configuración"
                Write-Host $errors[-1] -ForegroundColor Red
            } else {
                if (-not $supabaseConfig.env.SUPABASE_URL) {
                    $errors += "❌ No se encontró SUPABASE_URL en env"
                    Write-Host $errors[-1] -ForegroundColor Red
                } else {
                    $url = $supabaseConfig.env.SUPABASE_URL
                    if ($url -match "^https://.+\.supabase\.co$") {
                        Write-Host "   ✅ SUPABASE_URL válida: $url" -ForegroundColor Green
                    } else {
                        $warnings += "⚠️  SUPABASE_URL no parece válida: $url"
                        Write-Host $warnings[-1] -ForegroundColor Yellow
                    }
                }
                
                if (-not $supabaseConfig.env.SUPABASE_ACCESS_TOKEN) {
                    $errors += "❌ No se encontró SUPABASE_ACCESS_TOKEN en env"
                    Write-Host $errors[-1] -ForegroundColor Red
                } else {
                    $token = $supabaseConfig.env.SUPABASE_ACCESS_TOKEN
                    if ($token.Length -gt 20) {
                        Write-Host "   ✅ SUPABASE_ACCESS_TOKEN configurado (longitud: $($token.Length))" -ForegroundColor Green
                    } else {
                        $warnings += "⚠️  SUPABASE_ACCESS_TOKEN parece muy corto"
                        Write-Host $warnings[-1] -ForegroundColor Yellow
                    }
                }
            }
        }
    } catch {
        $errors += "❌ Error al leer configuración: $_"
        Write-Host $errors[-1] -ForegroundColor Red
    }
}

# 2. Verificar npx
Write-Host ""
Write-Host "📋 Verificando npx..." -ForegroundColor Yellow

try {
    $npxVersion = npx --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ npx disponible (versión: $npxVersion)" -ForegroundColor Green
    } else {
        $errors += "❌ npx no está disponible o no funciona correctamente"
        Write-Host $errors[-1] -ForegroundColor Red
    }
} catch {
    $errors += "❌ Error al verificar npx: $_"
    Write-Host $errors[-1] -ForegroundColor Red
}

# 3. Verificar variables de entorno del proyecto
Write-Host ""
Write-Host "📋 Verificando variables de entorno del proyecto..." -ForegroundColor Yellow

$envFile = ".env.local"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    if ($envContent -match "NEXT_PUBLIC_SUPABASE_URL=(.+)") {
        $projectUrl = $matches[1].Trim()
        Write-Host "   ✅ NEXT_PUBLIC_SUPABASE_URL encontrada: $projectUrl" -ForegroundColor Green
    } else {
        $warnings += "⚠️  No se encontró NEXT_PUBLIC_SUPABASE_URL en .env.local"
        Write-Host $warnings[-1] -ForegroundColor Yellow
    }
    
    if ($envContent -match "NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)") {
        Write-Host "   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY encontrada" -ForegroundColor Green
    } else {
        $warnings += "⚠️  No se encontró NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
        Write-Host $warnings[-1] -ForegroundColor Yellow
    }
} else {
    $warnings += "⚠️  No se encontró .env.local"
    Write-Host $warnings[-1] -ForegroundColor Yellow
}

# Resumen
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 Resumen de Verificación" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0) {
    Write-Host "✅ Configuración correcta!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "   1. Reinicia Cursor completamente" -ForegroundColor White
    Write-Host "   2. Prueba preguntando a la AI sobre tu base de datos" -ForegroundColor White
    Write-Host ""
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  Advertencias:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   $warning" -ForegroundColor Yellow
        }
        Write-Host ""
    }
} else {
    Write-Host "❌ Se encontraron errores:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   $error" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "💡 Solución:" -ForegroundColor Cyan
    Write-Host "   Ejecuta: .\scripts\setup-mcp.ps1" -ForegroundColor White
    Write-Host ""
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  Advertencias adicionales:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   $warning" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
