# Aplicar Políticas RLS para Endpoint de Email

## 📋 Resumen

Esta migración agrega políticas RLS que permiten al endpoint `/api/send-tickets-email` leer las tablas necesarias (`events`, `tickets`, `ticket_types`) cuando no hay usuario autenticado.

## 🎯 Problema Resuelto

El endpoint de email no podía leer eventos, tickets y ticket_types porque las políticas RLS existentes solo permitían acceso a usuarios autenticados. Esto causaba el error `404 - Compra no encontrada` en los logs.

## ✅ Solución

Se crearon 3 políticas RLS que permiten acceso cuando:
- `auth.uid() IS NULL` (endpoint interno sin usuario autenticado)
- Los datos están asociados a compras válidas (UUID válido)

## 📝 Pasos para Aplicar

### ⚠️ IMPORTANTE: Si ya aplicaste la migración y tenés recursión infinita

Si ya aplicaste `add_email_endpoint_rls_policies.sql` y estás viendo el error "infinite recursion detected in policy for relation 'events'", ejecutá primero el fix:

1. Abrí https://supabase.com/dashboard → tu proyecto → **SQL Editor**
2. Copiá y pegá el contenido de:
   ```
   synapseweb/supabase/migrations/fix_email_endpoint_rls_recursion.sql
   ```
3. Hacé clic en **Run**
4. Verificá que los eventos se carguen correctamente

### 1. Ir a Supabase Dashboard

1. Abrí https://supabase.com/dashboard
2. Seleccioná tu proyecto
3. Andá a **SQL Editor** (menú lateral izquierdo)

### 2. Ejecutar la Migración

1. Hacé clic en **New Query**
2. Copiá y pegá el contenido completo del archivo:
   ```
   synapseweb/supabase/migrations/add_email_endpoint_rls_policies.sql
   ```
3. Hacé clic en **Run** (o presioná `Ctrl+Enter`)

### 3. Verificar que se Aplicaron Correctamente

Ejecutá esta query para verificar:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('events', 'tickets', 'ticket_types')
  AND policyname LIKE '%Email endpoint%'
ORDER BY tablename, policyname;
```

**Resultado esperado:** Deberías ver 3 políticas:
- `Email endpoint can read events for purchases` (tabla: `events`)
- `Email endpoint can read tickets for purchases` (tabla: `tickets`)
- `Email endpoint can read ticket_types for purchases` (tabla: `ticket_types`)

## 🔒 Seguridad

Las políticas son seguras porque:

1. **Solo funcionan sin usuario autenticado**: `auth.uid() IS NULL`
2. **Validan UUIDs**: Solo permiten acceso a UUIDs válidos (imposibles de adivinar)
3. **Validan existencia**: Verifican que las compras existan antes de permitir acceso
4. **No exponen más información**: Solo permiten leer datos asociados a compras válidas
5. **No afectan otras políticas**: Las políticas existentes para usuarios/productores/admins siguen funcionando

## 🧪 Probar

Después de aplicar la migración:

1. Realizá una compra de prueba
2. Verificá que el email con el QR code llegue al comprador
3. Revisá los logs de Vercel para confirmar que no hay errores 404

## ⚠️ Si Algo Sale Mal

Si después de aplicar la migración sigue sin funcionar:

1. Verificá que las políticas se crearon correctamente (query de verificación arriba)
2. Revisá los logs de Vercel para ver el error específico
3. Verificá que el endpoint `/api/send-tickets-email` esté siendo llamado correctamente

## 📚 Archivos Relacionados

- `synapseweb/supabase/migrations/add_email_endpoint_rls_policies.sql` - Migración SQL
- `synapseweb/app/api/send-tickets-email/route.ts` - Endpoint de email
- `synapseweb/supabase/migrations/add_webhook_rls_policies.sql` - Políticas similares para webhook
