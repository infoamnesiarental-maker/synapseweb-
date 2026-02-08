# Plan de Implementación V1 - Manual de Operaciones

## 🎯 Objetivo

Implementar la lógica completa del Manual de Operaciones V1 con buenas prácticas y seguridad, asegurando que el sistema calcule correctamente los gastos operativos (7.73%) y respete el plazo mínimo de liquidación (240 horas).

---

## 📋 Cambios Críticos a Implementar

### 1. ✅ Corregir Plazo de Liquidación (240 horas desde compra)
### 2. ✅ Implementar Cálculo Completo de Gastos Operativos (7.73%)
### 3. ✅ Agregar Campos a Base de Datos
### 4. ✅ Validar Plazo Mínimo Antes de Transferir
### 5. ✅ Actualizar Webhook para Registrar Gastos Operativos

---

## 🔧 Implementación Paso a Paso

### FASE 1: Migración de Base de Datos

#### 1.1 Crear Migración SQL para Campos de Gastos Operativos

**Archivo**: `supabase/migrations/add_operating_costs_fields.sql`

```sql
-- ============================================
-- MIGRACIÓN: Campos de Gastos Operativos V1
-- ============================================
-- Agrega campos necesarios para registrar gastos operativos
-- según Manual de Operaciones V1 (7.73% del total cobrado)

-- ============================================
-- 1. Agregar campos de gastos operativos a purchases
-- ============================================

-- Monto neto recibido después de gastos operativos
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10, 2);

-- Gastos operativos totales (7.73% del total cobrado)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS operating_costs DECIMAL(10, 2);

-- Comisión de Mercado Pago (4.32% del total cobrado)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS mercadopago_commission DECIMAL(10, 2);

-- IVA sobre comisión de Mercado Pago (0.91% del total cobrado)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS iva_commission DECIMAL(10, 2);

-- Retención IIBB (2.50% del total cobrado)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS iibb_retention DECIMAL(10, 2);

-- Margen neto de Synapse (ganancia después de todos los costos)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS net_margin DECIMAL(10, 2);

-- Fecha de liberación de Mercado Pago (10 días después de la compra)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS money_release_date TIMESTAMPTZ;

-- Estado de liquidación
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending' 
CHECK (settlement_status IN ('pending', 'ready', 'transferred', 'failed'));

-- ============================================
-- 2. Agregar índices para consultas eficientes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_purchases_settlement_status 
ON purchases(settlement_status) 
WHERE settlement_status = 'ready';

CREATE INDEX IF NOT EXISTS idx_purchases_money_release_date 
ON purchases(money_release_date) 
WHERE money_release_date IS NOT NULL;

-- ============================================
-- 3. Agregar comentarios para documentación
-- ============================================

COMMENT ON COLUMN purchases.net_amount IS 'Monto neto recibido después de gastos operativos';
COMMENT ON COLUMN purchases.operating_costs IS 'Total de gastos operativos (7.73% del total cobrado)';
COMMENT ON COLUMN purchases.mercadopago_commission IS 'Comisión de Mercado Pago (4.32% del total)';
COMMENT ON COLUMN purchases.iva_commission IS 'IVA sobre comisión MP (0.91% del total)';
COMMENT ON COLUMN purchases.iibb_retention IS 'Retención IIBB Buenos Aires (2.50% del total)';
COMMENT ON COLUMN purchases.net_margin IS 'Margen neto de Synapse después de todos los costos';
COMMENT ON COLUMN purchases.money_release_date IS 'Fecha de liberación de Mercado Pago (10 días después de compra)';
COMMENT ON COLUMN purchases.settlement_status IS 'Estado de liquidación: pending, ready, transferred, failed';

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
```

**Acción**: Ejecutar esta migración en Supabase antes de continuar.

---

### FASE 2: Crear Utilidad para Cálculo de Gastos Operativos

#### 2.1 Actualizar `lib/utils/pricing.ts`

**Agregar funciones para calcular gastos operativos:**

```typescript
/**
 * Utilidades para calcular precios con comisiones
 */

// Configuración de comisiones
export const COMMISSION_RATE = 0.15 // 15% de comisión sobre precio base

// Constantes de gastos operativos (según Manual V1)
export const OPERATING_COSTS_RATE = 0.0773 // 7.73% del total cobrado
export const MERCADOPAGO_COMMISSION_RATE = 0.0432 // 4.32% del total cobrado
export const IVA_COMMISSION_RATE = 0.0091 // 0.91% del total cobrado (IVA sobre comisión MP)
export const IIBB_RETENTION_RATE = 0.0250 // 2.50% del total cobrado (Buenos Aires)

// Plazo mínimo de liquidación (240 horas = 10 días)
export const MIN_SETTLEMENT_HOURS = 240

export interface PriceBreakdown {
  basePrice: number // Precio base de la productora
  commission: number // Comisión de Synapse (15% sobre base)
  totalPrice: number // Precio final que paga el cliente
}

export interface OperatingCosts {
  mercadopagoCommission: number // 4.32% del total cobrado
  ivaCommission: number // 0.91% del total cobrado
  iibbRetention: number // 2.50% del total cobrado
  total: number // 7.73% del total cobrado
}

export interface FinancialBreakdown {
  totalAmount: number // Total cobrado al cliente
  baseAmount: number // Precio base de productora
  commissionAmount: number // Comisión Synapse (15%)
  operatingCosts: OperatingCosts // Gastos operativos desglosados
  netAmount: number // Monto neto recibido después de gastos
  netMargin: number // Margen neto de Synapse
  moneyReleaseDate: Date // Fecha de liberación de Mercado Pago (10 días)
}

/**
 * Calcula el precio final con comisión
 * 
 * @param basePrice Precio base establecido por la productora
 * @returns Desglose completo de precios
 */
export function calculatePrice(basePrice: number): PriceBreakdown {
  // Comisión sobre precio base
  const commission = basePrice * COMMISSION_RATE
  
  // Precio final (base + comisión)
  const totalPrice = basePrice + commission
  
  return {
    basePrice,
    commission: Math.round(commission),
    totalPrice: Math.round(totalPrice),
  }
}

/**
 * Calcula el precio total para múltiples tickets
 * 
 * @param tickets Array de { ticketTypeId, quantity, basePrice }
 * @returns Desglose total
 */
export function calculateTotalPrice(
  tickets: Array<{ ticketTypeId: string; quantity: number; basePrice: number }>
): PriceBreakdown {
  // Sumar todos los precios base
  const totalBasePrice = tickets.reduce(
    (sum, ticket) => sum + ticket.basePrice * ticket.quantity,
    0
  )
  
  return calculatePrice(totalBasePrice)
}

/**
 * Calcula los gastos operativos según Manual V1
 * 
 * @param totalAmount Total cobrado al cliente (precio base + comisión 15%)
 * @returns Desglose de gastos operativos
 */
export function calculateOperatingCosts(totalAmount: number): OperatingCosts {
  const mercadopagoCommission = totalAmount * MERCADOPAGO_COMMISSION_RATE
  const ivaCommission = totalAmount * IVA_COMMISSION_RATE
  const iibbRetention = totalAmount * IIBB_RETENTION_RATE
  
  return {
    mercadopagoCommission: Math.round(mercadopagoCommission * 100) / 100,
    ivaCommission: Math.round(ivaCommission * 100) / 100,
    iibbRetention: Math.round(iibbRetention * 100) / 100,
    total: Math.round((mercadopagoCommission + ivaCommission + iibbRetention) * 100) / 100,
  }
}

/**
 * Calcula el desglose financiero completo según Manual V1
 * 
 * @param baseAmount Precio base de la productora
 * @returns Desglose financiero completo
 */
export function calculateFinancialBreakdown(baseAmount: number): FinancialBreakdown {
  // Calcular precio con comisión
  const priceBreakdown = calculatePrice(baseAmount)
  const totalAmount = priceBreakdown.totalPrice
  
  // Calcular gastos operativos
  const operatingCosts = calculateOperatingCosts(totalAmount)
  
  // Calcular monto neto recibido
  const netAmount = totalAmount - operatingCosts.total
  
  // Calcular margen neto (netAmount - baseAmount)
  const netMargin = netAmount - baseAmount
  
  // Calcular fecha de liberación (10 días después de la compra)
  // Nota: Esta fecha se establecerá cuando se cree la compra
  const moneyReleaseDate = new Date()
  moneyReleaseDate.setHours(moneyReleaseDate.getHours() + (MIN_SETTLEMENT_HOURS))
  
  return {
    totalAmount,
    baseAmount,
    commissionAmount: priceBreakdown.commission,
    operatingCosts,
    netAmount: Math.round(netAmount * 100) / 100,
    netMargin: Math.round(netMargin * 100) / 100,
    moneyReleaseDate,
  }
}

/**
 * Valida si se puede transferir dinero según el plazo mínimo
 * 
 * @param purchaseCreatedAt Fecha de creación de la compra
 * @returns true si ya pasaron 240 horas desde la compra
 */
export function canTransfer(purchaseCreatedAt: Date | string): boolean {
  const purchaseDate = new Date(purchaseCreatedAt)
  const minSettlementDate = new Date(
    purchaseDate.getTime() + MIN_SETTLEMENT_HOURS * 60 * 60 * 1000
  )
  return new Date() >= minSettlementDate
}

/**
 * Calcula cuántas horas faltan para poder transferir
 * 
 * @param purchaseCreatedAt Fecha de creación de la compra
 * @returns Horas restantes (0 si ya se puede transferir)
 */
export function getRemainingHoursUntilTransfer(purchaseCreatedAt: Date | string): number {
  const purchaseDate = new Date(purchaseCreatedAt)
  const minSettlementDate = new Date(
    purchaseDate.getTime() + MIN_SETTLEMENT_HOURS * 60 * 60 * 1000
  )
  const now = new Date()
  const diffMs = minSettlementDate.getTime() - now.getTime()
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  return Math.max(0, diffHours)
}

/**
 * Formatea el desglose de precios para mostrar al usuario
 */
export function formatPriceBreakdown(breakdown: PriceBreakdown): {
  basePrice: string
  commission: string
  totalPrice: string
} {
  return {
    basePrice: breakdown.basePrice.toLocaleString('es-AR'),
    commission: breakdown.commission.toLocaleString('es-AR'),
    totalPrice: breakdown.totalPrice.toLocaleString('es-AR'),
  }
}
```

**Acción**: Reemplazar el contenido de `lib/utils/pricing.ts` con este código actualizado.

---

### FASE 3: Actualizar Hook de Checkout

#### 3.1 Actualizar `lib/hooks/useCheckout.ts`

**Cambios principales:**

1. **Corregir cálculo de `scheduledAt`**: De 48h después del evento a 240h después de la compra
2. **Calcular gastos operativos** al crear la compra
3. **Registrar todos los campos financieros** en la base de datos

**Código a modificar (líneas 149-179):**

```typescript
// ❌ CÓDIGO ACTUAL (INCORRECTO):
// Calcular cuándo transferir (24-48hs después del evento)
const { data: eventDates } = await supabase
  .from('events')
  .select('end_date')
  .eq('id', params.eventId)
  .single()

const endDate = eventDates?.end_date ? new Date(eventDates.end_date) : new Date()
const scheduledAt = new Date(endDate.getTime() + 48 * 60 * 60 * 1000) // 48 horas después

// ✅ CÓDIGO CORRECTO (V1):
import { calculateFinancialBreakdown, MIN_SETTLEMENT_HOURS } from '@/lib/utils/pricing'

// Calcular desglose financiero completo
const financialBreakdown = calculateFinancialBreakdown(totalBreakdown.basePrice)

// Calcular cuándo transferir (240 horas = 10 días después de la compra)
const purchaseDate = new Date() // Fecha actual (cuando se crea la compra)
const scheduledAt = new Date(
  purchaseDate.getTime() + MIN_SETTLEMENT_HOURS * 60 * 60 * 1000
) // 240 horas después de la compra

// Fecha de liberación de Mercado Pago (10 días después de la compra)
const moneyReleaseDate = financialBreakdown.moneyReleaseDate
```

**Código completo para insertar purchase (actualizar líneas 60-95):**

```typescript
// Calcular desglose financiero completo
const financialBreakdown = calculateFinancialBreakdown(totalBreakdown.basePrice)

// Crear compra con todos los campos financieros
const { data: purchase, error: purchaseError } = await supabase
  .from('purchases')
  .insert({
    user_id: user?.id || null,
    guest_email: params.guestEmail,
    guest_name: params.guestName,
    guest_phone: params.guestPhone,
    event_id: params.eventId,
    total_amount: financialBreakdown.totalAmount,
    base_amount: financialBreakdown.baseAmount,
    commission_amount: financialBreakdown.commissionAmount,
    // Gastos operativos
    operating_costs: financialBreakdown.operatingCosts.total,
    mercadopago_commission: financialBreakdown.operatingCosts.mercadopagoCommission,
    iva_commission: financialBreakdown.operatingCosts.ivaCommission,
    iibb_retention: financialBreakdown.operatingCosts.iibbRetention,
    // Resultados financieros
    net_amount: financialBreakdown.netAmount,
    net_margin: financialBreakdown.netMargin,
    money_release_date: moneyReleaseDate.toISOString(),
    settlement_status: 'pending',
    payment_method: 'mercadopago',
    payment_status: 'pending',
  })
  .select()
  .single()

if (purchaseError || !purchase) {
  throw new Error(`Error creando compra: ${purchaseError?.message}`)
}
```

**Acción**: Actualizar `lib/hooks/useCheckout.ts` con estos cambios.

---

### FASE 4: Actualizar Webhook de Mercado Pago

#### 4.1 Actualizar `app/api/mercadopago/webhook/route.ts`

**Cuando el pago se confirma, actualizar los campos financieros:**

```typescript
// Después de obtener el pago de Mercado Pago y actualizar payment_status
// Actualizar campos financieros con datos reales de Mercado Pago

import { calculateOperatingCosts } from '@/lib/utils/pricing'

// ... código existente para obtener payment de MP ...

// Calcular gastos operativos con el monto real recibido
const totalAmount = payment.transaction_amount // Monto real recibido de MP
const operatingCosts = calculateOperatingCosts(totalAmount)

// Obtener purchase actual para calcular net_amount y net_margin
const { data: currentPurchase } = await supabase
  .from('purchases')
  .select('base_amount, total_amount')
  .eq('id', purchaseId)
  .single()

if (currentPurchase) {
  const netAmount = totalAmount - operatingCosts.total
  const netMargin = netAmount - currentPurchase.base_amount
  
  // Actualizar purchase con datos financieros reales
  await supabase
    .from('purchases')
    .update({
      payment_status: 'completed',
      payment_provider_id: payment.id.toString(),
      payment_provider_data: payment,
      // Actualizar con montos reales de Mercado Pago
      total_amount: totalAmount, // Puede diferir ligeramente por redondeos
      operating_costs: operatingCosts.total,
      mercadopago_commission: operatingCosts.mercadopagoCommission,
      iva_commission: operatingCosts.ivaCommission,
      iibb_retention: operatingCosts.iibbRetention,
      net_amount: netAmount,
      net_margin: netMargin,
      settlement_status: 'ready', // Listo para transferir cuando pase el plazo
    })
    .eq('id', purchaseId)
}
```

**Acción**: Actualizar el webhook con este código.

---

### FASE 5: Validar Plazo Mínimo Antes de Transferir

#### 5.1 Actualizar `lib/hooks/useTransfers.ts`

**Agregar validación antes de procesar transferencia:**

```typescript
import { canTransfer, getRemainingHoursUntilTransfer } from '@/lib/utils/pricing'

// ... código existente ...

async function processTransfer(transferId: string) {
  // Obtener transfer con purchase
  const { data: transfer, error: transferError } = await supabase
    .from('transfers')
    .select(`
      *,
      purchase:purchases(
        id,
        created_at,
        settlement_status,
        money_release_date
      )
    `)
    .eq('id', transferId)
    .single()

  if (transferError || !transfer) {
    throw new Error('Transferencia no encontrada')
  }

  const purchase = transfer.purchase as any

  // ✅ VALIDAR PLAZO MÍNIMO (240 horas)
  if (!canTransfer(purchase.created_at)) {
    const hoursRemaining = getRemainingHoursUntilTransfer(purchase.created_at)
    throw new Error(
      `No se puede transferir antes de 240 horas desde la compra. Faltan ${hoursRemaining} horas.`
    )
  }

  // Validar que el settlement_status sea 'ready'
  if (purchase.settlement_status !== 'ready') {
    throw new Error('La compra no está lista para transferir')
  }

  // ... resto del código de transferencia ...
}
```

**Acción**: Actualizar `lib/hooks/useTransfers.ts` con esta validación.

---

### FASE 6: Actualizar Componentes de UI (Opcional pero Recomendado)

#### 6.1 Mostrar Alertas si se Intenta Transferir Antes del Plazo

**En el componente de transferencias del admin:**

```typescript
import { canTransfer, getRemainingHoursUntilTransfer } from '@/lib/utils/pricing'

// Al intentar transferir, mostrar alerta si no se puede
const handleTransferClick = (transfer: Transfer) => {
  if (!canTransfer(transfer.purchase.created_at)) {
    const hoursRemaining = getRemainingHoursUntilTransfer(transfer.purchase.created_at)
    alert(
      `⚠️ No se puede transferir todavía.\n` +
      `Deben pasar 240 horas (10 días) desde la compra.\n` +
      `Faltan ${hoursRemaining} horas.`
    )
    return
  }
  // Proceder con la transferencia
}
```

---

## 🔒 Buenas Prácticas y Seguridad

### 1. Validaciones en Múltiples Capas

- **Frontend**: Validar y mostrar alertas al usuario
- **Backend (API)**: Validar antes de procesar transferencias
- **Base de Datos**: Constraints y triggers (opcional pero recomendado)

### 2. Manejo de Errores

- Siempre usar try-catch en operaciones críticas
- Logs detallados para debugging
- Mensajes de error claros para el usuario

### 3. Seguridad de Datos

- No exponer cálculos financieros sensibles al cliente
- Validar permisos antes de mostrar datos financieros
- Solo ADMIN puede ver gastos operativos y margen neto

### 4. Testing

- Probar con el ejemplo del manual ($1.000 → $1.150)
- Verificar que los cálculos sean exactos
- Validar que no se pueda transferir antes de 240 horas

---

## ✅ Checklist de Implementación

### Migración de BD
- [ ] Crear y ejecutar migración `add_operating_costs_fields.sql`
- [ ] Verificar que los campos se crearon correctamente
- [ ] Verificar índices creados

### Código Backend
- [ ] Actualizar `lib/utils/pricing.ts` con funciones de gastos operativos
- [ ] Actualizar `lib/hooks/useCheckout.ts` con cálculo correcto de plazo
- [ ] Actualizar `app/api/mercadopago/webhook/route.ts` para registrar gastos
- [ ] Actualizar `lib/hooks/useTransfers.ts` con validación de plazo

### Código Frontend (Opcional)
- [ ] Mostrar alertas si se intenta transferir antes del plazo
- [ ] Mostrar fecha de liberación en UI de admin
- [ ] Mostrar desglose de gastos operativos (solo admin)

### Testing
- [ ] Probar creación de compra con cálculo correcto
- [ ] Probar webhook con datos reales de MP
- [ ] Probar validación de plazo mínimo
- [ ] Verificar que no se puede transferir antes de 240 horas
- [ ] Validar cálculos con ejemplo del manual ($1.000)

---

## 📊 Ejemplo de Validación

**Ticket de $1.000 según Manual V1:**

```
Total cobrado: $1.150
- Base: $1.000
- Comisión Synapse: $150

Gastos operativos (7.73%):
- Comisión MP: $49.68 (4.32%)
- IVA: $10.47 (0.91%)
- IIBB: $28.75 (2.50%)
- Total: $88.90

Resultado:
- Net amount: $1.061.10
- Net margin: $61.10
- Money release date: purchase.created_at + 240 horas
```

**Validar que estos números coincidan en el sistema después de la implementación.**

---

## 🚀 Orden de Implementación Recomendado

1. **FASE 1**: Migración de BD (crítico)
2. **FASE 2**: Utilidades de cálculo (base para todo)
3. **FASE 3**: Actualizar checkout (afecta nuevas compras)
4. **FASE 4**: Actualizar webhook (afecta compras existentes)
5. **FASE 5**: Validar transferencias (protección)
6. **FASE 6**: UI mejoras (opcional)

---

## ⚠️ Notas Importantes

1. **Backward Compatibility**: Las compras existentes no tendrán estos campos. Considerar migración de datos históricos si es necesario.

2. **Redondeos**: Usar `Math.round(value * 100) / 100` para mantener 2 decimales y evitar errores de precisión.

3. **Moneda**: Todos los cálculos en pesos argentinos (ARS). No usar formateo hasta el momento de mostrar.

4. **Validación de Plazo**: La validación debe estar en el backend. El frontend solo muestra alertas.

5. **Settlement Status**: 
   - `pending`: Compra creada, esperando pago
   - `ready`: Pago confirmado, esperando plazo mínimo
   - `transferred`: Dinero transferido al productor
   - `failed`: Error en transferencia

---

**Última actualización**: 2025
**Versión**: 1.0
**Estado**: Plan de implementación listo para ejecutar
