# Guía: Aplicar Políticas RLS para Webhook de Mercado Pago

## 📋 Resumen

Esta migración agrega políticas RLS específicas que permiten al webhook de Mercado Pago leer y actualizar compras sin necesidad de autenticación de usuario, resolviendo el problema de `PGRST116: The result contains 0 rows`.

## 🔒 Seguridad

Las políticas son seguras porque:
- ✅ Solo permiten acceso cuando `auth.uid() IS NULL` (webhook sin usuario)
- ✅ Solo permiten acceso a UUIDs válidos (imposibles de adivinar)
- ✅ No expone más información de la que ya está disponible públicamente
- ✅ Las políticas existentes para usuarios/productores/admins siguen funcionando

## 📝 Pasos para Aplicar

### Paso 1: Ejecutar la Migración en Supabase

1. **Ir a Supabase Dashboard:**
   - Abrí: https://supabase.com/dashboard
   - Seleccioná tu proyecto

2. **Ir a SQL Editor:**
   - En el menú lateral, hacé clic en "SQL Editor"
   - O directamente: https://supabase.com/dashboard/project/_/sql

3. **Ejecutar la Migración:**
   - Copiá el contenido completo del archivo:
     ```
     synapseweb/supabase/migrations/add_webhook_rls_policies.sql
     ```
   - Pegalo en el SQL Editor
   - Hacé clic en "Run" o presioná `Ctrl+Enter`

4. **Verificar que se ejecutó correctamente:**
   - Deberías ver: "Success. No rows returned" o similar
   - Si hay errores, revisá el mensaje y avisame

### Paso 2: Verificar las Políticas Creadas

Ejecutá esta query en Supabase SQL Editor para verificar:

```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'purchases'
  AND policyname LIKE '%Webhook%'
ORDER BY policyname;
```

Deberías ver 2 políticas:
- `Webhook can read purchases by id` (SELECT)
- `Webhook can update purchases` (UPDATE)

### Paso 3: Probar el Flujo Completo

1. **Hacer una compra de prueba:**
   - Ir a tu app en producción
   - Seleccionar un evento
   - Completar el checkout
   - Realizar el pago en Mercado Pago

2. **Verificar en Vercel Logs:**
   - Ir a Vercel Dashboard → Tu proyecto → Logs
   - Buscar logs del webhook alrededor del momento del pago
   - Deberías ver: `✅ Compra {purchaseId} actualizada a estado: completed`
   - NO deberías ver: `❌ Error obteniendo compra en webhook`

3. **Verificar en Supabase:**
   - Ejecutá esta query para ver la compra actualizada:
   ```sql
   SELECT 
     id,
     payment_status,
     payment_provider_id,
     created_at,
     updated_at
   FROM purchases
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Verificar que se envió el email:**
   - Revisar en Resend Dashboard: https://resend.com/emails
   - Deberías ver un email enviado al comprador con los tickets

## 🔍 Troubleshooting

### Si la migración falla:

**Error: "policy already exists"**
- Esto es normal si ya ejecutaste la migración antes
- Las políticas se recrean automáticamente (DROP IF EXISTS)

**Error: "permission denied"**
- Asegurate de estar usando una cuenta con permisos de administrador en Supabase
- Verificá que estás en el proyecto correcto

### Si el webhook sigue fallando:

1. **Verificar que las políticas se crearon:**
   ```sql
   SELECT policyname FROM pg_policies 
   WHERE tablename = 'purchases' 
   AND policyname LIKE '%Webhook%';
   ```

2. **Verificar logs de Vercel:**
   - Buscar errores específicos del webhook
   - Verificar que el `purchaseId` es un UUID válido

3. **Verificar en Supabase:**
   - Que la compra existe con ese ID
   - Que el `external_reference` en Mercado Pago coincide con el `purchase_id`

## ✅ Checklist Post-Aplicación

- [ ] Migración ejecutada sin errores
- [ ] Políticas verificadas en Supabase
- [ ] Compra de prueba realizada
- [ ] Webhook procesado correctamente (ver logs de Vercel)
- [ ] Email enviado al comprador (ver Resend Dashboard)
- [ ] Tickets creados en Supabase
- [ ] Transferencia creada (si el pago fue completado)

## 📚 Referencias

- Archivo de migración: `supabase/migrations/add_webhook_rls_policies.sql`
- Código del webhook: `app/api/mercadopago/webhook/route.ts`
- Documentación de RLS: https://supabase.com/docs/guides/auth/row-level-security
