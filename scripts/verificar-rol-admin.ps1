# Script para verificar rol de admin
# Ejecutar desde PowerShell: .\scripts\verificar-rol-admin.ps1

Write-Host "=== Verificacion de Rol Admin ===" -ForegroundColor Cyan
Write-Host ""

$email = Read-Host "Ingresa tu email"

Write-Host ""
Write-Host "Ejecuta este SQL en Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Gray
Write-Host "-- Verificar perfil y rol" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""
Write-Host "SELECT " -ForegroundColor Green
Write-Host "  p.id," -ForegroundColor Green
Write-Host "  p.email," -ForegroundColor Green
Write-Host "  p.role," -ForegroundColor Green
Write-Host "  u.email as auth_email," -ForegroundColor Green
Write-Host "  u.created_at as user_created" -ForegroundColor Green
Write-Host "FROM profiles p" -ForegroundColor Green
Write-Host "JOIN auth.users u ON p.id = u.id" -ForegroundColor Green
Write-Host "WHERE u.email = '$email';" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Gray
Write-Host "-- Si el rol NO es 'admin', ejecuta esto:" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""
Write-Host "UPDATE profiles " -ForegroundColor Green
Write-Host "SET role = 'admin' " -ForegroundColor Green
Write-Host "WHERE email = '$email';" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Gray
Write-Host "-- Si el perfil NO existe, ejecuta esto:" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""
Write-Host "INSERT INTO profiles (id, email, role)" -ForegroundColor Green
Write-Host "SELECT id, email, 'admin'" -ForegroundColor Green
Write-Host "FROM auth.users" -ForegroundColor Green
Write-Host "WHERE email = '$email'" -ForegroundColor Green
Write-Host "ON CONFLICT (id) DO UPDATE SET role = 'admin';" -ForegroundColor Green
Write-Host ""
