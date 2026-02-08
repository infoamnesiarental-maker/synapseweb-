# Testeo Rápido - Verificar Campos Financieros V1

## 🎯 Objetivo

Verificar que cuando creás una compra desde la app, se calculan y guardan correctamente todos los campos financieros según el Manual V1.

---

## ⚡ Testeo Rápido (5 minutos)

### Paso 1: Crear la compra desde la app

1. **Abrí tu app** en el navegador (localhost o producción)
2. **Andá a un evento** que tenga tickets disponibles
3. **Agregá tickets al carrito** (ej: 1 ticket de $1.000)
4. **Completá el checkout**:
   - Si no estás logueado: completá email, nombre, teléfono
   - Si estás logueado: solo confirmá
5. **Hacé clic en "Confirmar compra" o "Pagar"**
6. **IMPORTANTE**: En este momento, la compra YA SE CREÓ en la base de datos
7. **Cuando veas que te redirige a Mercado Pago**:
   - ✅ Podés cerrar la pestaña inmediatamente
   - ✅ O podés cancelar en Mercado Pago
   - ❌ NO necesitás completar el pago

**¿Por qué funciona así?**
- El código crea la compra en la BD ANTES de redirigir a Mercado Pago
- Los campos financieros se calculan y guardan en ese momento
- El pago solo actualiza `payment_status` de 'pending' a 'completed'

---

### Paso 2: Verificar en la base de datos

Abrí el **SQL Editor** de Supabase y ejecutá:

```sql
-- Ver la última compra creada con todos sus campos financieros
SELECT 
  id,
  total_amount,              -- Debería ser $1.150 (base $1.000 + 15% = $150)
  base_amount,               -- Debería ser $1.000
  commission_amount,         -- Debería ser $150 (15%)
  operating_costs,           -- Debería ser ~$88.90 (7.73% de $1.150)
  mercadopago_commission,    -- Debería ser ~$49.68 (4.32% de $1.150)
  iva_commission,            -- Debería ser ~$10.47 (0.91% de $1.150)
  iibb_retention,            -- Debería ser ~$28.75 (2.50% de $1.150)
  net_amount,                -- Debería ser ~$1.061.10 (total - operating_costs)
  net_margin,                -- Debería ser ~$61.10 (net_amount - base_amount)
  money_release_date,        -- Debería ser 240 horas después de created_at
  settlement_status,         -- Debería ser 'pending'
  payment_status,            -- Debería ser 'pending'
  created_at
FROM purchases
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado**: 
- ✅ Todos los campos financieros deberían tener valores (NO NULL)
- ✅ `money_release_date` debería ser aproximadamente 10 días después de `created_at`
- ✅ `settlement_status` debería ser `'pending'`
- ✅ `payment_status` debería ser `'pending'`

---

### Paso 3: Verificar que los cálculos son correctos

Ejecutá este query para verificar que los cálculos coinciden:

```sql
-- Verificar cálculos manualmente
SELECT 
  total_amount,
  base_amount,
  commission_amount,
  operating_costs,
  -- Verificar: operating_costs debería ser ~7.73% de total_amount
  ROUND((operating_costs / total_amount) * 100, 2) as operating_costs_percentage,
  -- Verificar: net_amount debería ser total_amount - operating_costs
  ROUND(total_amount - operating_costs, 2) as calculated_net_amount,
  net_amount,
  -- Verificar: net_margin debería ser net_amount - base_amount
  ROUND(net_amount - base_amount, 2) as calculated_net_margin,
  net_margin,
  -- Verificar: money_release_date debería ser ~240 horas después
  ROUND(EXTRACT(EPOCH FROM (money_release_date - created_at)) / 3600, 2) as hours_until_release
FROM purchases
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado**:
- ✅ `operating_costs_percentage` debería ser **~7.73**
- ✅ `calculated_net_amount` debería ser igual a `net_amount`
- ✅ `calculated_net_margin` debería ser igual a `net_margin`
- ✅ `hours_until_release` debería ser **~240** (10 días)

---

## ✅ Checklist

- [ ] La compra se creó correctamente
- [ ] Todos los campos financieros tienen valores (NO NULL)
- [ ] `operating_costs` es ~7.73% de `total_amount`
- [ ] `net_amount` = `total_amount` - `operating_costs`
- [ ] `net_margin` = `net_amount` - `base_amount`
- [ ] `money_release_date` es ~240 horas después de `created_at`
- [ ] `settlement_status` es `'pending'`
- [ ] `payment_status` es `'pending'`

---

## 🐛 Si algo no funciona

### Error: "column does not exist"

**Problema**: No aplicaste la primera migración (`add_operating_costs_fields_v1.sql`)

**Solución**: 
1. Andá al SQL Editor de Supabase
2. Copiá y pegá el contenido de `supabase/migrations/add_operating_costs_fields_v1.sql`
3. Ejecutá el script
4. Volvé a intentar crear una compra

### Los campos financieros están en NULL

**Problema**: El código de `useCheckout.ts` no está actualizado

**Solución**: 
1. Verificá que el archivo `lib/hooks/useCheckout.ts` tenga el código actualizado
2. Verificá que esté usando `calculateFinancialBreakdown()`
3. Reiniciá el servidor de desarrollo

### Los cálculos no coinciden

**Problema**: Los porcentajes pueden variar por redondeos

**Solución**: 
- Los valores pueden variar en centavos por redondeos
- Lo importante es que `operating_costs_percentage` esté entre 7.7% y 7.8%
- Y que `hours_until_release` esté entre 239 y 241 horas

---

## 📝 Notas

- **No necesitás pagar**: La compra se crea antes de redirigir a Mercado Pago
- **Podés cancelar**: Cuando te redirija a Mercado Pago, podés cerrar la pestaña
- **Los campos se calculan automáticamente**: No necesitás hacer nada manual
- **Podés crear múltiples compras**: Cada una se guarda independientemente
