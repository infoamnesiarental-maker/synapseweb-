# Guía de Testeo - Implementación V1

## ✅ Verificación Previa

### 1. Verificar que los campos financieros existen

Ejecuta en el SQL Editor de Supabase:

```sql
-- Verificar que los campos financieros existen
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'purchases' 
AND column_name IN (
  'operating_costs',
  'mercadopago_commission',
  'iva_commission',
  'iibb_retention',
  'net_amount',
  'net_margin',
  'money_release_date',
  'settlement_status'
)
ORDER BY column_name;
```

**Resultado esperado**: Deberías ver 8 filas con estos campos.

### 2. Verificar que las vistas existen

```sql
-- Verificar vistas
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name IN ('purchases_public', 'purchases_admin');
```

**Resultado esperado**: Deberías ver 2 filas (ambas vistas).

---

## 🧪 Testeo Paso a Paso

### TEST 1: Crear una Compra y Verificar Campos Financieros

#### Paso 1.1: Crear una compra desde la app

**IMPORTANTE**: La compra se crea en la base de datos ANTES de redirigir a Mercado Pago. No necesitás pagar nada.

Pasos concretos:

1. **Iniciá sesión en tu app** (como cliente o productor, o como invitado)
2. **Andá a un evento publicado** (cualquier evento que tenga tickets disponibles)
3. **Agregá tickets al carrito** (ej: 2 tickets de $500 cada uno = $1.000 base)
4. **Completá el formulario de checkout**:
   - Si estás logueado: solo confirmá
   - Si no estás logueado: completá email, nombre, teléfono
5. **Hacé clic en "Confirmar compra" o "Pagar"**
6. **En este momento, la compra YA SE CREÓ en la base de datos** con todos los campos financieros
7. **Cuando veas que te redirige a Mercado Pago**:
   - Podés cerrar la pestaña inmediatamente
   - O podés cancelar en Mercado Pago
   - **NO necesitás completar el pago**
8. **La compra ya está guardada** con `payment_status = 'pending'` y todos los campos financieros calculados

#### Paso 1.2: Verificar en la base de datos

Ejecuta en SQL Editor:

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
- Todos los campos financieros deberían tener valores calculados
- `money_release_date` debería ser aproximadamente 10 días después de `created_at`
- `settlement_status` debería ser `'pending'`

#### Paso 1.3: Verificar cálculos manualmente

```sql
-- Verificar que los cálculos son correctos
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
  EXTRACT(EPOCH FROM (money_release_date - created_at)) / 3600 as hours_until_release
FROM purchases
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado**:
- `operating_costs_percentage` debería ser ~7.73
- `calculated_net_amount` debería ser igual a `net_amount`
- `calculated_net_margin` debería ser igual a `net_margin`
- `hours_until_release` debería ser ~240

---

### TEST 2: Verificar que Clientes NO Ven Campos Financieros

#### Paso 2.1: Consultar como cliente (usando vista pública)

```sql
-- Simular consulta de cliente (usando vista pública)
SELECT *
FROM purchases_public
WHERE user_id = (SELECT id FROM profiles WHERE role != 'admin' LIMIT 1)
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado**: 
- Deberías ver: `id`, `user_id`, `total_amount`, `base_amount`, `commission_amount`, `payment_status`, etc.
- NO deberías ver: `operating_costs`, `net_margin`, `mercadopago_commission`, etc.

#### Paso 2.2: Verificar que el hook usePurchases no trae campos sensibles

1. En tu app, andá a "Mis Compras" (como cliente)
2. Abrí la consola del navegador (F12)
3. Verificá que la respuesta de la API solo incluye campos públicos

**Resultado esperado**: 
- La respuesta NO debería incluir `operating_costs`, `net_margin`, etc.

---

### TEST 3: Verificar que Productores NO Ven Campos Financieros

#### Paso 3.1: Consultar como productor

```sql
-- Simular consulta de productor
SELECT *
FROM purchases_public
WHERE event_id IN (
  SELECT e.id 
  FROM events e
  JOIN producers p ON e.producer_id = p.id
  LIMIT 1
)
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado**: 
- Deberías ver: `base_amount`, `total_amount`, `commission_amount`
- NO deberías ver: `operating_costs`, `net_margin`, `mercadopago_commission`, etc.

---

### TEST 4: Verificar que Admins SÍ Ven Todos los Campos

#### Paso 4.1: Consultar como admin (usando vista admin)

```sql
-- Simular consulta de admin (usando vista admin)
-- Nota: Solo funciona si estás autenticado como admin
SELECT *
FROM purchases_admin
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado**: 
- Deberías ver TODOS los campos, incluyendo `operating_costs`, `net_margin`, etc.

---

### TEST 5: Simular Webhook de Mercado Pago

#### Paso 5.1: Crear una compra de prueba

1. Creá una compra desde la app (como en TEST 1)
2. Anotá el `id` de la compra

#### Paso 5.2: Simular actualización del webhook

Ejecuta en SQL Editor (simulando lo que hace el webhook):

```sql
-- Simular que el webhook actualiza la compra cuando el pago se confirma
-- Reemplazá 'TU_PURCHASE_ID' con el ID real de la compra

UPDATE purchases
SET 
  payment_status = 'completed',
  settlement_status = 'ready',
  payment_provider_id = 'TEST_PAYMENT_123',
  updated_at = NOW()
WHERE id = 'TU_PURCHASE_ID'
RETURNING 
  id,
  payment_status,
  settlement_status,
  operating_costs,
  net_margin,
  money_release_date;
```

**Resultado esperado**: 
- `payment_status` debería cambiar a `'completed'`
- `settlement_status` debería cambiar a `'ready'`
- Los campos financieros deberían mantenerse iguales

---

### TEST 6: Verificar Validación de Plazo Mínimo (240 horas)

#### Paso 6.1: Intentar transferir antes del plazo

1. Creá una compra de prueba
2. Actualizá el `payment_status` a `'completed'` y `settlement_status` a `'ready'`
3. Intentá procesar la transferencia desde el dashboard del productor

**Resultado esperado**: 
- Debería aparecer un error diciendo que faltan X horas/días para poder transferir
- La transferencia NO debería completarse

#### Paso 6.2: Verificar cálculo de horas restantes

```sql
-- Ver compras que están listas para transferir pero aún no pasaron 240 horas
SELECT 
  id,
  created_at,
  money_release_date,
  settlement_status,
  EXTRACT(EPOCH FROM (money_release_date - NOW())) / 3600 as hours_remaining,
  CASE 
    WHEN money_release_date <= NOW() THEN 'READY'
    ELSE 'WAITING'
  END as transfer_status
FROM purchases
WHERE payment_status = 'completed'
  AND settlement_status = 'ready'
ORDER BY created_at DESC;
```

**Resultado esperado**: 
- `hours_remaining` debería ser positivo para compras recientes
- `transfer_status` debería ser `'WAITING'` para compras que aún no cumplieron 240 horas

---

## ✅ Checklist Final

- [ ] Los campos financieros se calculan correctamente al crear una compra
- [ ] Los cálculos coinciden con el Manual V1 (7.73% de gastos operativos)
- [ ] `money_release_date` es 240 horas después de `created_at`
- [ ] Clientes NO ven campos financieros sensibles
- [ ] Productores NO ven campos financieros sensibles
- [ ] Admins SÍ ven todos los campos financieros
- [ ] El webhook puede actualizar campos financieros cuando confirma el pago
- [ ] La validación de plazo mínimo (240 horas) funciona correctamente
- [ ] No se puede transferir antes de cumplir el plazo mínimo

---

## 🐛 Troubleshooting

### Error: "column does not exist"

**Problema**: No aplicaste la primera migración (`add_operating_costs_fields_v1.sql`)

**Solución**: Aplicá la migración primero, luego la segunda.

### Error: "permission denied for table purchases"

**Problema**: Las políticas RLS están bloqueando el acceso

**Solución**: Verificá que estés autenticado con el rol correcto.

### Los campos financieros están en NULL

**Problema**: El código de `useCheckout.ts` no está actualizado

**Solución**: Verificá que el código esté usando `calculateFinancialBreakdown()`.

---

## 📝 Notas

- Los testeo se pueden hacer en desarrollo/sandbox
- No necesitás hacer pagos reales para testear los cálculos
- Podés crear compras manualmente en la BD para testear más rápido
