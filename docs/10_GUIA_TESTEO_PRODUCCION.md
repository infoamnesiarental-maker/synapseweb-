# Guía de Testeo en Producción - Mercado Pago

## 🎯 Objetivo

Verificar que todo funciona correctamente en producción antes de empezar a vender tickets reales.

---

## ✅ PRE-TEST: Verificaciones Previas

### 1. Verificar Deploy en Vercel

**Pasos:**
1. Ir a: https://vercel.com/dashboard
2. Seleccionar tu proyecto
3. Verificar que el último deploy está en estado "Ready" (verde)
4. Verificar que el commit más reciente es el correcto

**Qué verificar:**
- [ ] Deploy completado sin errores
- [ ] URL de producción accesible
- [ ] No hay errores en los logs de Vercel

---

### 2. Verificar Variables de Entorno en Vercel

**Pasos:**
1. En Vercel Dashboard → Settings → Environment Variables
2. Verificar las siguientes variables:

**Variables requeridas:**
- [ ] `MERCADOPAGO_ACCESS_TOKEN` = Token de **PRODUCCIÓN** (debe empezar con `APP_USR-`, NO con `TEST-`)
- [ ] `NEXT_PUBLIC_APP_URL` = URL de tu app en producción (ej: `https://tu-app.vercel.app`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = URL de Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Anon key de Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = Service role key de Supabase

**⚠️ IMPORTANTE:**
- Si `MERCADOPAGO_ACCESS_TOKEN` empieza con `TEST-`, estás usando sandbox (NO sirve para producción)
- El token de producción debe empezar con `APP_USR-`

---

### 3. Verificar Configuración en Mercado Pago

**Pasos:**
1. Ir a: https://www.mercadopago.com.ar/developers
2. Verificar que estás en modo **PRODUCCIÓN** (no sandbox)
3. Verificar que el webhook está configurado:
   - URL: `https://tu-app.vercel.app/api/mercadopago/webhook`
   - Eventos: `payment` (o todos los eventos de pago)

**Qué verificar:**
- [ ] Estás en modo producción
- [ ] Webhook configurado con la URL correcta
- [ ] Webhook está activo (no en estado "error")

---

## 🧪 TESTS PRINCIPALES

### TEST 1: Verificar que la App Carga Correctamente

**Objetivo:** Verificar que la app funciona en producción sin errores.

**Pasos:**
1. Abrir tu app en producción (URL de Vercel)
2. Abrir la consola del navegador (F12 → Console)
3. Navegar por la app:
   - Ver eventos
   - Ver detalles de un evento
   - Intentar iniciar un checkout

**Qué verificar:**
- [ ] La app carga sin errores
- [ ] No hay errores en la consola del navegador
- [ ] Los eventos se muestran correctamente
- [ ] La navegación funciona

**Si hay errores:**
- Revisar logs de Vercel
- Verificar que las variables de entorno están correctas
- Verificar que Supabase está accesible

---

### TEST 2: Verificar Creación de Preferencia (SIN PAGAR)

**Objetivo:** Verificar que se puede crear una preferencia de pago en Mercado Pago sin necesidad de pagar.

**Pasos:**
1. Ir a un evento en tu app
2. Seleccionar tickets y hacer clic en "Comprar"
3. Completar el formulario de checkout (email, nombre, teléfono)
4. Hacer clic en "Pagar con Mercado Pago"
5. **NO completar el pago** - solo verificar que te redirige a Mercado Pago

**Qué verificar:**
- [ ] Se crea la compra en la base de datos (verificar en Supabase)
- [ ] Se redirige a Mercado Pago correctamente
- [ ] La URL de Mercado Pago es de **PRODUCCIÓN** (no sandbox)
- [ ] En la URL de Mercado Pago, el monto es correcto
- [ ] No hay errores en la consola del navegador

**Verificar en Supabase:**
```sql
-- Ver la última compra creada
SELECT 
  id,
  total_amount,
  base_amount,
  commission_amount,
  operating_costs,
  net_amount,
  net_margin,
  money_release_date,
  settlement_status,
  payment_status,
  created_at
FROM purchases
ORDER BY created_at DESC
LIMIT 1;
```

**Qué deberías ver:**
- `total_amount`: Total cobrado (ej: $11.50 si el ticket es $10)
- `base_amount`: Precio base del productor (ej: $10.00)
- `commission_amount`: Tu comisión del 15% (ej: $1.50)
- `operating_costs`: Gastos operativos calculados (ej: $0.89)
- `net_amount`: Monto neto después de gastos (ej: $10.61)
- `net_margin`: Tu margen neto (ej: $0.61)
- `money_release_date`: Fecha de liberación (10 días después)
- `settlement_status`: "pending" (porque aún no se pagó)
- `payment_status`: "pending" (porque aún no se pagó)

---

### TEST 3: Verificar Cálculos Financieros

**Objetivo:** Verificar que los cálculos financieros son correctos.

**Ejemplo con ticket de $10.00:**

**Cálculo esperado:**
- Precio base: $10.00
- Comisión (15%): $1.50
- **Total cobrado: $11.50**

**Gastos operativos (7.73% sobre $11.50):**
- Comisión MP (4.32%): $0.50
- IVA sobre comisión (0.91%): $0.10
- IIBB (2.50%): $0.29
- **Total gastos: $0.89**

**Resultado:**
- Neto después de gastos: $11.50 - $0.89 = **$10.61**
- Margen neto: $10.61 - $10.00 = **$0.61**

**Verificar en Supabase:**
```sql
-- Verificar cálculos de la última compra
SELECT 
  total_amount,
  base_amount,
  commission_amount,
  operating_costs,
  mercadopago_commission,
  iva_commission,
  iibb_retention,
  net_amount,
  net_margin,
  -- Verificar que los cálculos son correctos
  ROUND((total_amount - base_amount)::numeric, 2) as calculated_commission,
  ROUND((mercadopago_commission + iva_commission + iibb_retention)::numeric, 2) as calculated_costs
FROM purchases
ORDER BY created_at DESC
LIMIT 1;
```

**Qué verificar:**
- [ ] `commission_amount` = 15% del precio base
- [ ] `operating_costs` = 7.73% del total
- [ ] `mercadopago_commission` = 4.32% del total
- [ ] `iva_commission` = 0.91% del total
- [ ] `iibb_retention` = 2.50% del total
- [ ] `net_amount` = total_amount - operating_costs
- [ ] `net_margin` = net_amount - base_amount

---

### TEST 4: Verificar Protección de Datos Sensibles

**Objetivo:** Verificar que los datos financieros NO son visibles para usuarios/productores.

**Pasos:**
1. Crear una compra (como en TEST 2)
2. Verificar que un usuario/productor NO puede ver campos financieros

**Verificar en Supabase (como usuario normal):**
```sql
-- Vista pública (lo que ven usuarios/productores)
SELECT * FROM purchases_public 
WHERE id = 'ID_DE_LA_COMPRA';
```

**Qué NO deberías ver:**
- ❌ `operating_costs`
- ❌ `mercadopago_commission`
- ❌ `iva_commission`
- ❌ `iibb_retention`
- ❌ `net_amount`
- ❌ `net_margin`
- ❌ `money_release_date`
- ❌ `settlement_status`

**Qué SÍ deberías ver:**
- ✅ `id`
- ✅ `total_amount`
- ✅ `base_amount`
- ✅ `commission_amount`
- ✅ `payment_status`
- ✅ `created_at`

**Verificar en Supabase (como admin):**
```sql
-- Vista admin (solo admins pueden ver)
SELECT * FROM purchases_admin 
WHERE id = 'ID_DE_LA_COMPRA';
```

**Nota:** Si no sos admin en Supabase, esta query puede devolver 0 filas. Eso está bien, significa que la protección funciona.

---

### TEST 5: Test de Pago Real (PEQUEÑO)

**⚠️ IMPORTANTE:** Este test requiere hacer un pago REAL con dinero real. Hacelo solo cuando estés seguro de que todo lo anterior funciona.

**Objetivo:** Verificar que el flujo completo funciona con un pago real.

**Pasos:**
1. Crear un evento de prueba con un ticket de **$10.00** (mínimo posible)
2. Completar el checkout normalmente
3. Pagar con Mercado Pago usando una tarjeta real
4. Completar el pago
5. Verificar que te redirige a la página de éxito

**Qué verificar:**
- [ ] El pago se procesa correctamente en Mercado Pago
- [ ] Te redirige a la página de éxito
- [ ] El ticket se genera correctamente
- [ ] El webhook se ejecuta (verificar en logs de Vercel)

**Verificar en Supabase después del pago:**
```sql
-- Verificar que el pago se registró correctamente
SELECT 
  id,
  total_amount,
  payment_status,
  settlement_status,
  operating_costs,
  net_amount,
  net_margin,
  money_release_date,
  payment_provider_id,
  created_at
FROM purchases
WHERE id = 'ID_DE_LA_COMPRA'
ORDER BY created_at DESC
LIMIT 1;
```

**Qué deberías ver después del pago:**
- `payment_status`: "completed"
- `settlement_status`: "ready" (listo para transferir después de 10 días)
- `payment_provider_id`: ID del pago en Mercado Pago
- Todos los campos financieros calculados correctamente

---

### TEST 6: Verificar Webhook

**Objetivo:** Verificar que el webhook de Mercado Pago funciona correctamente.

**Pasos:**
1. Después de hacer un pago real (TEST 5)
2. Verificar en los logs de Vercel que el webhook se ejecutó

**Verificar en Vercel:**
1. Ir a Vercel Dashboard → Tu proyecto → Deployments → Último deploy
2. Hacer clic en "Functions" → `/api/mercadopago/webhook`
3. Ver los logs

**Qué deberías ver en los logs:**
- `🚀 Webhook recibido de Mercado Pago`
- `✅ Pago procesado correctamente`
- `✅ Compra actualizada en BD`

**Verificar en Supabase:**
```sql
-- Verificar que el webhook actualizó los campos financieros
SELECT 
  id,
  payment_status,
  settlement_status,
  operating_costs,
  net_amount,
  net_margin,
  updated_at
FROM purchases
WHERE payment_provider_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 1;
```

**Qué verificar:**
- [ ] `payment_status` = "completed"
- [ ] `settlement_status` = "ready"
- [ ] Todos los campos financieros están calculados
- [ ] `updated_at` es reciente (después del pago)

---

### TEST 7: Verificar Validación de Plazo Mínimo

**Objetivo:** Verificar que no se puede transferir antes de 240 horas (10 días).

**Pasos:**
1. Crear una compra y pagarla (TEST 5)
2. Intentar transferir inmediatamente (desde el dashboard del productor)
3. Verificar que aparece un error

**Qué deberías ver:**
- Error: "No se puede transferir aún. Faltan X horas para cumplir el plazo mínimo de 240 horas"

**Verificar en código:**
```sql
-- Verificar que el plazo mínimo está configurado
SELECT 
  id,
  created_at,
  money_release_date,
  EXTRACT(EPOCH FROM (money_release_date - created_at)) / 3600 as hours_until_release
FROM purchases
WHERE payment_status = 'completed'
ORDER BY created_at DESC
LIMIT 1;
```

**Qué verificar:**
- [ ] `hours_until_release` ≈ 240 horas (10 días)
- [ ] `money_release_date` = `created_at` + 240 horas

---

## 📊 Resumen de Tests

| Test | Descripción | Crítico | Estado |
|------|-------------|---------|--------|
| TEST 1 | App carga correctamente | ✅ Sí | [ ] |
| TEST 2 | Crear preferencia (sin pagar) | ✅ Sí | [ ] |
| TEST 3 | Cálculos financieros | ✅ Sí | [ ] |
| TEST 4 | Protección de datos | ✅ Sí | [ ] |
| TEST 5 | Pago real (pequeño) | ✅ Sí | [ ] |
| TEST 6 | Webhook funciona | ✅ Sí | [ ] |
| TEST 7 | Validación plazo mínimo | ⚠️ Medio | [ ] |

---

## 🚨 Troubleshooting

### Problema: No se crea la preferencia de pago

**Posibles causas:**
- Token de Mercado Pago incorrecto (verificar que es de producción)
- Variables de entorno no configuradas en Vercel
- Error en la API de Mercado Pago

**Solución:**
1. Verificar logs de Vercel
2. Verificar que `MERCADOPAGO_ACCESS_TOKEN` es de producción
3. Verificar que la URL de la app está correcta en `NEXT_PUBLIC_APP_URL`

---

### Problema: El webhook no se ejecuta

**Posibles causas:**
- Webhook no configurado en Mercado Pago
- URL del webhook incorrecta
- Webhook bloqueado por firewall

**Solución:**
1. Verificar en Mercado Pago Developers que el webhook está configurado
2. Verificar que la URL es correcta: `https://tu-app.vercel.app/api/mercadopago/webhook`
3. Verificar logs de Vercel para ver si hay errores

---

### Problema: Los cálculos financieros son incorrectos

**Posibles causas:**
- Error en la función `calculateOperatingCosts`
- Porcentajes incorrectos
- Error en la base de datos

**Solución:**
1. Verificar que los porcentajes en `lib/utils/pricing.ts` son correctos:
   - MP: 4.32%
   - IVA: 0.91%
   - IIBB: 2.50%
2. Verificar que la función se llama correctamente en `useCheckout.ts`
3. Verificar en Supabase que los campos están guardados correctamente

---

## ✅ Checklist Final

Antes de empezar a vender tickets reales, verificá:

- [ ] Todos los tests principales pasaron
- [ ] El webhook funciona correctamente
- [ ] Los cálculos financieros son correctos
- [ ] Los datos sensibles están protegidos
- [ ] La validación de plazo mínimo funciona
- [ ] No hay errores en los logs de Vercel
- [ ] La app funciona correctamente en producción

---

## 🎉 Siguiente Paso

Una vez que todos los tests pasen, podés empezar a vender tickets reales con confianza.

**Recomendación:** Empezá con eventos pequeños para validar que todo funciona correctamente antes de eventos grandes.
