# Implementación de Cambios Críticos V1

## Resumen

Este documento explica cómo se implementarían los 3 cambios críticos identificados en el análisis de alineación, cómo se verían desde cada rol y qué diferencias traerían.

**IMPORTANTE - Acceso a Datos Financieros**:
- **Solo el ADMIN** puede ver todos los datos financieros internos (gastos operativos, margen neto, etc.)
- **Cliente y Productor** NO ven estos datos (no les incumben)
- El admin necesita un **panel financiero completo** para entender el estado de la empresa

---

## 1. Cambio Crítico: Plazo de Liquidación (240 horas desde compra)

### ¿Qué cambia?

**ANTES**: Las transferencias se programaban 48 horas después del fin del evento.

**DESPUÉS**: Las transferencias se programan 240 horas (10 días) después de la fecha de compra, respetando el plazo de liberación de Mercado Pago.

### Implementación Técnica

#### 1.1 Modificar Cálculo de Fecha de Transferencia

**Archivo**: `lib/hooks/useCheckout.ts`

**Código actual** (línea 149-157):
```typescript
// ❌ INCORRECTO: 48 horas después del evento
const endDate = eventDates?.end_date ? new Date(eventDates.end_date) : new Date()
const scheduledAt = new Date(endDate.getTime() + 48 * 60 * 60 * 1000) // 48 horas después
```

**Código nuevo**:
```typescript
// ✅ CORRECTO: 240 horas (10 días) desde la compra
const MIN_SETTLEMENT_HOURS = 240 // 10 días según Manual V1

// Usar fecha de creación de la compra, no fecha del evento
const purchaseDate = new Date(purchase.created_at)
const scheduledAt = new Date(
  purchaseDate.getTime() + MIN_SETTLEMENT_HOURS * 60 * 60 * 1000
)
```

#### 1.2 Agregar Validación al Procesar Transferencias

**Archivo**: `lib/hooks/useTransfers.ts` o nueva función en `app/api/admin/process-transfer/route.ts`

```typescript
function canTransfer(purchase: Purchase): { canTransfer: boolean; reason?: string } {
  const purchaseDate = new Date(purchase.created_at)
  const minSettlementDate = new Date(
    purchaseDate.getTime() + 240 * 60 * 60 * 1000 // 240 horas
  )
  const now = new Date()
  
  if (now < minSettlementDate) {
    const hoursRemaining = Math.ceil((minSettlementDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    return {
      canTransfer: false,
      reason: `Deben pasar 240 horas desde la compra. Faltan ${hoursRemaining} horas.`
    }
  }
  
  return { canTransfer: true }
}
```

#### 1.3 Actualizar UI para Mostrar Fecha Correcta

**Archivo**: `components/dashboard/TransfersList.tsx` (o similar)

**ANTES**:
```typescript
// Mostraba fecha basada en evento
<p>Transferencia programada: {format(event.end_date + 48h)}</p>
```

**DESPUÉS**:
```typescript
// Muestra fecha basada en compra + 240 horas
const transferDate = new Date(purchase.created_at)
transferDate.setHours(transferDate.getHours() + 240)

<p>Transferencia disponible: {format(transferDate)}</p>
<p className="text-sm text-gray-400">
  (10 días después de la compra - Plazo mínimo requerido)
</p>
```

### Cómo se Ve desde Cada Rol

#### 👤 Cliente Final
- **No ve cambios**: El cliente no ve información sobre transferencias
- **Experiencia**: Sin cambios

#### 🏢 Productor/Organizador
- **ANTES**: Veía "Transferencia en 48h después del evento"
- **DESPUÉS**: Ve "Transferencia disponible en 10 días desde la compra"
- **Dashboard de Transferencias**:
  ```
  ┌─────────────────────────────────────┐
  │ Transferencia Pendiente             │
  │ Evento: Concierto Rock              │
  │ Monto: $10.000                      │
  │                                     │
  │ ⏰ Disponible el: 25/02/2025        │
  │ (10 días después de la compra)     │
  │                                     │
  │ [Bloqueado hasta esa fecha]         │
  └─────────────────────────────────────┘
  ```

#### 👨‍💼 Admin/Plataforma
- **ANTES**: Podía transferir inmediatamente después del evento
- **DESPUÉS**: 
  - Ve alerta si intenta transferir antes de 240 horas
  - Botón de transferencia deshabilitado hasta cumplir plazo
  - Dashboard muestra:
    ```
    ┌─────────────────────────────────────┐
    │ Transferencias Pendientes           │
    │                                     │
    │ ⚠️ 5 transferencias bloqueadas     │
    │    (Esperando plazo mínimo)         │
    │                                     │
    │ ✅ 2 transferencias disponibles     │
    │    (Plazo cumplido)                 │
    │                                     │
    │ [Ver Detalles]                      │
    └─────────────────────────────────────┘
    ```

### Diferencias y Beneficios

1. **Protección Financiera**: Evita transferir antes de que Mercado Pago libere el dinero
2. **Previsibilidad**: Productores saben exactamente cuándo recibirán el dinero
3. **Cumplimiento**: Respeta el plazo de liberación de Mercado Pago
4. **Reducción de Riesgo**: Elimina baches financieros

---

## 2. Cambio Crítico: Cálculo Completo de Gastos Operativos (8.93%)

### ¿Qué cambia?

**IMPORTANTE**: Los gastos operativos son **INTERNOS** de la plataforma. Se descuentan de la comisión del 15% que paga el cliente, pero **NO se muestran a nadie** (ni cliente ni productor).

**ANTES**: Solo se consideraba la comisión de Mercado Pago (~4.1%)

**DESPUÉS**: Se calculan TODOS los gastos operativos internamente:
- Comisión MP: 4.32%
- IVA sobre Comisión: 0.91%
- Retención IIBB: 2.50%
- Impuesto al Cheque: 1.20%
- **Total: 8.93%**

**Propósito**: Saber el margen neto real y detectar si una venta genera pérdida. Los costos son internos, no se exponen.

### Implementación Técnica

#### 2.1 Crear Función de Cálculo de Gastos Operativos

**Archivo**: `lib/utils/pricing.ts` (agregar)

```typescript
export interface OperatingCosts {
  mercadopagoCommission: number  // 4.32%
  ivaCommission: number          // 0.91%
  iibbRetention: number          // 2.50%
  checkTax: number               // 1.20%
  total: number                  // 8.93%
}

/**
 * Calcula los gastos operativos sobre el total cobrado
 * Según Manual V1: 8.93% del total (precio base + comisión 15%)
 */
export function calculateOperatingCosts(totalAmount: number): OperatingCosts {
  return {
    mercadopagoCommission: Math.round(totalAmount * 0.0432 * 100) / 100,  // 4.32%
    ivaCommission: Math.round(totalAmount * 0.0091 * 100) / 100,          // 0.91%
    iibbRetention: Math.round(totalAmount * 0.0250 * 100) / 100,           // 2.50%
    checkTax: Math.round(totalAmount * 0.0120 * 100) / 100,               // 1.20%
    total: Math.round(totalAmount * 0.0893 * 100) / 100,                  // 8.93%
  }
}

/**
 * Calcula el margen neto de Synapse
 */
export function calculateNetMargin(
  totalAmount: number,
  baseAmount: number,
  operatingCosts: OperatingCosts
): number {
  return Math.round((totalAmount - baseAmount - operatingCosts.total) * 100) / 100
}
```

#### 2.2 Actualizar Webhook para Registrar Gastos (INTERNO)

**Archivo**: `app/api/mercadopago/webhook/route.ts`

**IMPORTANTE**: Estos cálculos son **solo para uso interno** de la plataforma. Se guardan en BD para análisis, pero NO se muestran a clientes ni productores.

```typescript
import { calculateOperatingCosts, calculateNetMargin } from '@/lib/utils/pricing'

// ... código existente ...

const payment = await paymentResponse.json()
const purchaseId = payment.external_reference

// Obtener compra para tener total_amount
const { data: purchase } = await supabase
  .from('purchases')
  .select('total_amount, base_amount')
  .eq('id', purchaseId)
  .single()

if (purchase) {
  // Calcular gastos operativos completos (INTERNO - no se muestra)
  const operatingCosts = calculateOperatingCosts(purchase.total_amount)
  
  // Calcular margen neto (INTERNO - solo para admin)
  const netMargin = calculateNetMargin(
    purchase.total_amount,
    purchase.base_amount,
    operatingCosts
  )
  
  // Actualizar compra con gastos (solo para análisis interno)
  await supabase
    .from('purchases')
    .update({
      // ... campos existentes ...
      
      // Gastos operativos (INTERNOS - no se exponen)
      mercadopago_commission: operatingCosts.mercadopagoCommission,
      iva_commission: operatingCosts.ivaCommission,
      iibb_retention: operatingCosts.iibbRetention,
      check_tax: operatingCosts.checkTax,
      operating_costs_total: operatingCosts.total,
      
      // Margen neto (solo para admin)
      net_margin: netMargin,
      
      // Monto neto recibido (después de todos los gastos)
      net_amount: purchase.total_amount - operatingCosts.total,
    })
    .eq('id', purchaseId)
}
```

**¿Para qué se guarda?**: Para que el admin pueda:
- Ver si una venta genera pérdida (margen negativo)
- Analizar rentabilidad del negocio
- Detectar problemas (ej: si costos suben al 22% por falta de certificado)

#### 2.3 Migración SQL para Nuevos Campos (INTERNOS)

**Archivo**: `supabase/migrations/add_operating_costs_fields.sql` (nuevo)

**IMPORTANTE**: Estos campos son solo para análisis interno. No se exponen en APIs públicas ni se muestran a clientes/productores.

```sql
-- Agregar campos de gastos operativos (INTERNOS - solo para análisis)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS mercadopago_commission DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS iva_commission DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS iibb_retention DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS check_tax DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS operating_costs_total DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS net_margin DECIMAL(10, 2);

-- Estos campos NO se incluyen en queries para productores
-- Solo se usan en dashboard de admin para análisis
```

**¿Para qué se guardan?**: 
- Para calcular margen neto real
- Para detectar si una venta genera pérdida
- Para análisis financiero interno
- **NO se muestran a clientes ni productores**

### Cómo se Ve desde Cada Rol

#### 👤 Cliente Final
- **No ve cambios**: El cliente sigue viendo el mismo precio
- **Experiencia**: Sin cambios visibles

#### 🏢 Productor/Organizador
- **ANTES**: Veía información básica de venta
- **DESPUÉS**: Ve información clara y simple:
  ```
  ┌─────────────────────────────────────┐
  │ Resumen de Venta                    │
  │                                     │
  │ Precio base establecido: $1.000   │
  │                                     │
  │ Total cobrado al cliente: $1.150  │
  │ (incluye cargo por servicio 15%)   │
  │                                     │
  │ Tu liquidación: $1.000             │
  │ (100% del precio base)             │
  │                                     │
  │ ⏰ Disponible en: 10 días          │
  └─────────────────────────────────────┘
  ```

**IMPORTANTE**: 
- El productor **NO paga ningún porcentaje**
- El 15% es un cargo de servicio que paga el **cliente**
- El productor recibe el **100% del precio base** que estableció
- Los gastos operativos (8.93%) son internos de la plataforma, no se muestran

#### 👨‍💼 Admin/Plataforma
- **ANTES**: No sabía el margen neto real
- **DESPUÉS**: Ve información clave para tomar decisiones:
  ```
  ┌─────────────────────────────────────┐
  │ Análisis Financiero - Venta #123    │
  │                                     │
  │ Total cobrado: $1.150              │
  │ Liquidación productor: -$1.000     │
  │ Gastos operativos: -$102.66        │
  │ ────────────────────────────────  │
  │ Margen neto: $47.34 (4.11%)       │
  │                                     │
  │ ✅ Margen positivo                 │
  │                                     │
  │ [Ver Detalles] (opcional)          │
  └─────────────────────────────────────┘
  ```

**IMPORTANTE**:
- El admin solo necesita saber: **margen neto** y si hay **pérdida**
- El desglose completo de gastos es opcional (se puede ver en detalles si se necesita)
- Lo crítico es: **¿Esta venta genera ganancia o pérdida?**

### Diferencias y Beneficios

1. **Cálculo Preciso Interno**: El sistema sabe el margen neto real (aunque no se muestre completo)
2. **Detección de Pérdidas**: Si los gastos superan el 15%, se detecta automáticamente
3. **Toma de Decisiones**: Admin sabe si una venta es rentable o no
4. **Cumplimiento Fiscal**: Todos los impuestos están registrados internamente
5. **Simplicidad para Usuarios**: Cliente y productor no ven costos internos (no les incumben)

**Aclaración importante**:
- Los gastos operativos (8.93%) se descuentan de la comisión del 15% que paga el cliente
- El productor NO paga nada, recibe el 100% del precio base
- El cliente paga: precio base + 15% de cargo por servicio
- La plataforma absorbe los gastos operativos de su comisión del 15%

---

## 3. Cambio Crítico: Validaciones Críticas

### ¿Qué cambia?

**ANTES**: No había validaciones de certificado fiscal, match de titularidad, ni plazo mínimo

**DESPUÉS**: Sistema valida automáticamente antes de permitir operaciones críticas

### Implementación Técnica

#### 3.1 Validación de Certificado Fiscal

**Archivo**: `lib/utils/mercadopago-validation.ts` (nuevo)

```typescript
/**
 * Valida que la cuenta de Mercado Pago tenga certificado fiscal
 * Sin certificado, los costos suben del 8.93% al ~22%
 */
export async function validateFiscalCertificate(
  accessToken: string
): Promise<{ isValid: boolean; message: string }> {
  try {
    // Consultar información de la cuenta en Mercado Pago
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    const account = await response.json()
    
    // Verificar si tiene certificado de monotributo
    const hasCertificate = account.fiscal_data?.tax_id_type === 'CUIL' || 
                          account.fiscal_data?.tax_id_type === 'CUIT'
    
    if (!hasCertificate) {
      return {
        isValid: false,
        message: '⚠️ La cuenta no tiene certificado fiscal. Los gastos operativos pueden subir del 8.93% al ~22%. Se recomienda cargar el certificado de Monotributo en Mercado Pago.'
      }
    }
    
    return {
      isValid: true,
      message: '✅ Certificado fiscal válido'
    }
  } catch (error) {
    return {
      isValid: false,
      message: 'Error al validar certificado fiscal'
    }
  }
}
```

**Uso en configuración**:
```typescript
// Al configurar credenciales de producción
const fiscalValidation = await validateFiscalCertificate(accessToken)
if (!fiscalValidation.isValid) {
  // Mostrar alerta al admin
  // Bloquear operaciones hasta resolver
}
```

#### 3.2 Validación de Match de Titularidad

**Archivo**: `lib/utils/bank-validation.ts` (nuevo)

```typescript
/**
 * Valida que la cuenta bancaria sea de la misma persona/empresa
 * que la cuenta de Mercado Pago
 */
export function validateAccountOwnership(
  mpAccountName: string,
  bankAccountName: string,
  mpTaxId: string,
  bankTaxId: string
): { isValid: boolean; message: string } {
  // Normalizar nombres (quitar espacios, mayúsculas, etc.)
  const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '')
  
  const mpNameNormalized = normalize(mpAccountName)
  const bankNameNormalized = normalize(bankAccountName)
  
  // Verificar que los nombres coincidan (o sean similares)
  const nameMatch = mpNameNormalized.includes(bankNameNormalized) || 
                    bankNameNormalized.includes(mpNameNormalized)
  
  // Verificar que los CUIT/CUIL coincidan
  const taxIdMatch = mpTaxId === bankTaxId
  
  if (!nameMatch || !taxIdMatch) {
    return {
      isValid: false,
      message: '⚠️ La cuenta bancaria debe ser de la misma persona/empresa que la cuenta de Mercado Pago. Sin esto, el banco puede bloquear fondos.'
    }
  }
  
  return {
    isValid: true,
    message: '✅ Match de titularidad confirmado'
  }
}
```

**Uso al configurar cuenta bancaria de productora**:
```typescript
// Cuando productora configura su cuenta bancaria
const ownershipValidation = validateAccountOwnership(
  producer.mpAccountName,
  producer.bankAccountName,
  producer.mpTaxId,
  producer.bankTaxId
)

if (!ownershipValidation.isValid) {
  // Bloquear configuración hasta corregir
  // Mostrar mensaje al productor
}
```

#### 3.3 Validación de Plazo Mínimo (ya explicada en sección 1)

### Cómo se Ve desde Cada Rol

#### 👤 Cliente Final
- **No ve cambios**: Validaciones son internas
- **Experiencia**: Sin cambios

#### 🏢 Productor/Organizador

**Al configurar cuenta bancaria**:
```
┌─────────────────────────────────────┐
│ Configurar Cuenta Bancaria          │
│                                     │
│ Nombre en MP: Juan Pérez           │
│ CUIT en MP: 20-12345678-9          │
│                                     │
│ Nombre en Banco: [Juan Pérez]      │
│ CUIT en Banco: [20-12345678-9]     │
│                                     │
│ ✅ Match de titularidad confirmado │
│                                     │
│ [Guardar]                           │
└─────────────────────────────────────┘
```

**Si no hay match**:
```
┌─────────────────────────────────────┐
│ ⚠️ Error de Configuración           │
│                                     │
│ La cuenta bancaria debe ser de la  │
│ misma persona que la cuenta de MP. │
│                                     │
│ Nombre en MP: Juan Pérez           │
│ Nombre en Banco: María García      │
│                                     │
│ ❌ No coinciden                     │
│                                     │
│ [Corregir Datos]                    │
└─────────────────────────────────────┘
```

#### 👨‍💼 Admin/Plataforma

**Dashboard de Validaciones**:
```
┌─────────────────────────────────────┐
│ Estado del Sistema                  │
│                                     │
│ ✅ Certificado Fiscal: Válido      │
│ ✅ Match Titularidad: OK            │
│ ✅ Plazos Configurados: Correcto    │
│                                     │
│ Estado General: ✅ Operativo       │
└─────────────────────────────────────┘
```

**Si hay problemas**:
```
┌─────────────────────────────────────┐
│ ⚠️ Alertas del Sistema              │
│                                     │
│ ❌ Certificado Fiscal: Faltante    │
│    Los costos pueden subir al 22%   │
│    [Ver Detalles]                   │
│                                     │
│ ⚠️ 3 Productoras sin validar        │
│    titularidad                       │
│    [Revisar]                        │
└─────────────────────────────────────┘
```

### Diferencias y Beneficios

1. **Prevención de Pérdidas**: Detecta problemas antes de que generen pérdidas
2. **Cumplimiento Legal**: Asegura que todo esté en orden fiscalmente
3. **Transparencia**: Todos saben qué validaciones deben cumplir
4. **Automatización**: No requiere revisión manual constante
5. **Alertas Tempranas**: Notifica problemas antes de que afecten operaciones

---

## Resumen de Impacto por Rol

### Cliente Final
- **Cambios visibles**: Ninguno
- **Experiencia**: Sin cambios
- **Beneficio indirecto**: Sistema más estable y confiable
- **Datos que ve**: Solo precio base + 15% de cargo por servicio

### Productor/Organizador
- **Cambios visibles**: 
  - Ve fecha real de transferencia (10 días)
  - Debe validar titularidad de cuenta
- **Datos que ve**:
  - Precio base que estableció
  - Que recibirá el 100% del precio base
  - Cuándo estará disponible el dinero
- **Datos que NO ve**:
  - Gastos operativos internos
  - Margen neto de la plataforma
  - Desglose de costos (MP, IVA, IIBB, etc.)
- **Beneficios**:
  - Mayor transparencia en plazos
  - Expectativas claras
  - Protección contra errores de configuración

### Admin/Plataforma (ÚNICO con acceso completo)
- **Cambios visibles**:
  - Dashboard financiero completo
  - Análisis de rentabilidad
  - Alertas de pérdidas
  - Validaciones del sistema
- **Datos que SÍ ve** (exclusivo):
  - Gastos operativos desglosados (MP, IVA, IIBB, Imp. Cheque)
  - Margen neto por venta
  - Margen neto total de la empresa
  - Detección de ventas con pérdida
  - Estado de validaciones (certificado fiscal, titularidad, etc.)
  - Análisis de tendencias financieras
- **Beneficios**:
  - Control total del sistema
  - Prevención de pérdidas
  - Cumplimiento fiscal
  - Toma de decisiones informada
  - Visión completa del negocio

---

## Orden de Implementación Recomendado

1. **Primero**: Validación de plazo mínimo (más crítico para evitar baches)
2. **Segundo**: Cálculo de gastos operativos (necesario para análisis)
3. **Tercero**: Validaciones críticas (prevención a largo plazo)

## 4. Panel Financiero para Admin

### Objetivo

Crear un dashboard completo y legible donde el **admin** (único con acceso) pueda ver todos los datos financieros internos para entender el estado de la empresa.

### Estructura del Panel

#### 4.1 Vista General (Overview)

**Ruta**: `/admin/finanzas` o nueva pestaña en `/admin`

**Componentes principales**:

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Dashboard Financiero - Synapse                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │ Total Cobrado│ │ Gastos Total │ │ Margen Neto  │         │
│ │              │ │              │ │              │         │
│ │ $150.000     │ │ -$13.395     │ │ $7.050       │         │
│ │              │ │ (8.93%)      │ │ (4.11%)      │         │
│ │ ↑ 15% vs mes │ │ ↑ 2% vs mes  │ │ ↑ 12% vs mes │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 📈 Tendencias (Últimos 30 días)                      │   │
│ │                                                       │   │
│ │ [Gráfico de líneas: Total cobrado, Gastos, Margen]  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ⚠️ Alertas Críticas                                  │   │
│ │                                                       │   │
│ │ • 3 ventas con margen negativo (-$450 total)        │   │
│ │ • Certificado fiscal pendiente (costos al 22%)       │   │
│ │ • 5 transferencias bloqueadas (esperando plazo)      │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2 Vista Detallada de Ventas

**Componente**: Tabla de ventas con filtros

```
┌─────────────────────────────────────────────────────────────┐
│ 💰 Ventas Detalladas                                        │
├─────────────────────────────────────────────────────────────┤
│ [Filtros: Fecha, Productor, Estado, Margen] [Exportar]     │
├─────────────────────────────────────────────────────────────┤
│ ID      │ Evento      │ Cobrado │ Gastos │ Margen │ Estado │
│─────────┼─────────────┼─────────┼────────┼────────┼────────│
│ #001    │ Concierto   │ $1.150  │ $102.66│ $47.34 │ ✅     │
│ #002    │ Festival    │ $2.300  │ $205.39│ $94.61 │ ✅     │
│ #003    │ Teatro      │ $575    │ $51.35 │ -$1.35 │ ❌     │
│         │             │         │        │        │        │
│ [Ver Detalles] al hacer clic en una fila                   │
└─────────────────────────────────────────────────────────────┘
```

**Modal de Detalles de Venta**:
```
┌─────────────────────────────────────────────────────────────┐
│ Detalles de Venta #001                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Evento: Concierto Rock                                      │
│ Productor: Productora XYZ                                   │
│ Fecha: 15/02/2025                                           │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Desglose Financiero                                   │   │
│ │                                                       │   │
│ │ Total cobrado:        $1.150                         │   │
│ │   • Precio base:      $1.000                         │   │
│ │   • Cargo servicio:   $150                           │   │
│ │                                                       │   │
│ │ Gastos operativos:    -$102.66                       │   │
│ │   • Comisión MP:      -$49.68                        │   │
│ │   • IVA:              -$10.47                        │   │
│ │   • IIBB:             -$28.75                        │   │
│ │   • Imp. Cheque:      -$13.80                        │   │
│ │                                                       │   │
│ │ Liquidación productor: -$1.000                       │   │
│ │ ────────────────────────────────────────────────    │   │
│ │ Margen neto:          $47.34 (4.11%)                │   │
│ │                                                       │   │
│ │ Estado: ✅ Rentable                                  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ [Cerrar]                                                    │
└─────────────────────────────────────────────────────────────┘
```

#### 4.3 Vista de Análisis por Período

**Componente**: Análisis mensual/semanal

```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Análisis - Febrero 2025                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Resumen del Mes                                       │   │
│ │                                                       │   │
│ │ Ventas totales:        130                           │   │
│ │ Total cobrado:          $150.000                      │   │
│ │ Gastos operativos:      -$13.395 (8.93%)             │   │
│ │ Liquidaciones:          -$130.000                    │   │
│ │ ────────────────────────────────────────────────    │   │
│ │ Margen neto total:     $6.605 (4.11%)               │   │
│ │                                                       │   │
│ │ Ventas rentables:      127 (97.7%)                  │   │
│ │ Ventas con pérdida:    3 (2.3%)                     │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Distribución de Gastos                                │   │
│ │                                                       │   │
│ │ [Gráfico de torta]                                    │   │
│ │ • Comisión MP: 60%                                   │   │
│ │ • IIBB: 25%                                          │   │
│ │ • Imp. Cheque: 10%                                   │   │
│ │ • IVA: 5%                                            │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 4.4 Vista de Alertas y Validaciones

**Componente**: Estado del sistema

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Estado del Sistema                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Validaciones Críticas                                 │   │
│ │                                                       │   │
│ │ ✅ Certificado Fiscal: Válido                        │   │
│ │ ✅ Match Titularidad: OK                             │   │
│ │ ✅ Plazos Configurados: Correcto                     │   │
│ │                                                       │   │
│ │ Estado General: ✅ Operativo                         │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Alertas Activas                                       │   │
│ │                                                       │   │
│ │ 🔴 3 ventas con pérdida detectadas                   │   │
│ │    [Ver Detalles]                                     │   │
│ │                                                       │   │
│ │ 🟡 5 transferencias bloqueadas                       │   │
│ │    (Esperando plazo mínimo)                           │   │
│ │                                                       │   │
│ │ 🟢 Todo lo demás operando correctamente              │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Implementación Técnica

#### 4.5 Crear Hook para Datos Financieros

**Archivo**: `lib/hooks/useAdminFinancials.ts` (nuevo)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface FinancialSummary {
  totalRevenue: number
  totalOperatingCosts: number
  totalNetMargin: number
  marginPercentage: number
  profitableSales: number
  lossSales: number
  totalSales: number
}

export interface SaleDetail {
  id: string
  eventName: string
  producerName: string
  totalAmount: number
  baseAmount: number
  operatingCosts: number
  netMargin: number
  marginPercentage: number
  isProfitable: boolean
  createdAt: string
}

export function useAdminFinancials(dateRange?: { start: Date; end: Date }) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [sales, setSales] = useState<SaleDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchFinancials() {
      try {
        setLoading(true)
        setError(null)

        // Query para obtener ventas con todos los datos financieros
        let query = supabase
          .from('purchases')
          .select(`
            id,
            total_amount,
            base_amount,
            operating_costs_total,
            net_margin,
            created_at,
            events(name),
            producers(users:user_id(profiles(full_name)))
          `)
          .eq('payment_status', 'completed')

        // Aplicar filtro de fecha si existe
        if (dateRange) {
          query = query
            .gte('created_at', dateRange.start.toISOString())
            .lte('created_at', dateRange.end.toISOString())
        }

        const { data: purchases, error: fetchError } = await query

        if (fetchError) {
          throw new Error(fetchError.message)
        }

        if (!purchases) {
          setSummary({
            totalRevenue: 0,
            totalOperatingCosts: 0,
            totalNetMargin: 0,
            marginPercentage: 0,
            profitableSales: 0,
            lossSales: 0,
            totalSales: 0,
          })
          return
        }

        // Calcular resumen
        const totalRevenue = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0)
        const totalOperatingCosts = purchases.reduce((sum, p) => sum + (p.operating_costs_total || 0), 0)
        const totalNetMargin = purchases.reduce((sum, p) => sum + (p.net_margin || 0), 0)
        const profitableSales = purchases.filter(p => (p.net_margin || 0) > 0).length
        const lossSales = purchases.filter(p => (p.net_margin || 0) <= 0).length

        setSummary({
          totalRevenue,
          totalOperatingCosts,
          totalNetMargin,
          marginPercentage: totalRevenue > 0 ? (totalNetMargin / totalRevenue) * 100 : 0,
          profitableSales,
          lossSales,
          totalSales: purchases.length,
        })

        // Procesar ventas detalladas
        const salesDetails: SaleDetail[] = purchases.map((p: any) => ({
          id: p.id,
          eventName: p.events?.name || 'Sin nombre',
          producerName: p.producers?.users?.profiles?.full_name || 'Sin nombre',
          totalAmount: p.total_amount || 0,
          baseAmount: p.base_amount || 0,
          operatingCosts: p.operating_costs_total || 0,
          netMargin: p.net_margin || 0,
          marginPercentage: p.total_amount > 0 ? ((p.net_margin || 0) / p.total_amount) * 100 : 0,
          isProfitable: (p.net_margin || 0) > 0,
          createdAt: p.created_at,
        }))

        setSales(salesDetails)
      } catch (err: any) {
        setError(err.message || 'Error obteniendo datos financieros')
      } finally {
        setLoading(false)
      }
    }

    fetchFinancials()
  }, [dateRange, supabase])

  return { summary, sales, loading, error }
}
```

#### 4.6 Crear Componente de Dashboard Financiero

**Archivo**: `components/admin/FinancialDashboard.tsx` (nuevo)

```typescript
'use client'

import { useAdminFinancials } from '@/lib/hooks/useAdminFinancials'
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils/format'

export function FinancialDashboard() {
  const { summary, sales, loading, error } = useAdminFinancials()

  if (loading) {
    return <div>Cargando datos financieros...</div>
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  if (!summary) {
    return <div>No hay datos disponibles</div>
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-medium rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green" />
            <span className="text-white/60 text-sm">Total Cobrado</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatPrice(summary.totalRevenue)}
          </p>
        </div>

        <div className="bg-gray-medium rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-yellow" />
            <span className="text-white/60 text-sm">Gastos Operativos</span>
          </div>
          <p className="text-3xl font-bold text-yellow">
            -{formatPrice(summary.totalOperatingCosts)}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {(summary.totalOperatingCosts / summary.totalRevenue * 100).toFixed(2)}% del total
          </p>
        </div>

        <div className="bg-gray-medium rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green" />
            <span className="text-white/60 text-sm">Margen Neto</span>
          </div>
          <p className="text-3xl font-bold text-green">
            {formatPrice(summary.totalNetMargin)}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {summary.marginPercentage.toFixed(2)}% del total
          </p>
        </div>
      </div>

      {/* Alertas */}
      {summary.lossSales > 0 && (
        <div className="bg-red/10 border border-red/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red" />
            <span className="text-red font-semibold">Ventas con Pérdida Detectadas</span>
          </div>
          <p className="text-white/80">
            {summary.lossSales} venta(s) generaron pérdida. Revisar detalles.
          </p>
        </div>
      )}

      {/* Tabla de Ventas */}
      <div className="bg-gray-medium rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Ventas Detalladas</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-white/60 text-sm">ID</th>
                <th className="text-left p-3 text-white/60 text-sm">Evento</th>
                <th className="text-right p-3 text-white/60 text-sm">Cobrado</th>
                <th className="text-right p-3 text-white/60 text-sm">Gastos</th>
                <th className="text-right p-3 text-white/60 text-sm">Margen</th>
                <th className="text-center p-3 text-white/60 text-sm">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 text-white/80 text-sm font-mono">
                    {sale.id.substring(0, 8)}
                  </td>
                  <td className="p-3 text-white">{sale.eventName}</td>
                  <td className="p-3 text-right text-white">
                    {formatPrice(sale.totalAmount)}
                  </td>
                  <td className="p-3 text-right text-yellow">
                    -{formatPrice(sale.operatingCosts)}
                  </td>
                  <td className={`p-3 text-right font-semibold ${
                    sale.isProfitable ? 'text-green' : 'text-red'
                  }`}>
                    {formatPrice(sale.netMargin)}
                  </td>
                  <td className="p-3 text-center">
                    {sale.isProfitable ? (
                      <CheckCircle className="w-5 h-5 text-green mx-auto" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

#### 4.7 Integrar en Panel Admin Existente

**Archivo**: `app/admin/page.tsx`

Agregar nueva pestaña "Finanzas":

```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'producers' | 'users' | 'refunds' | 'finanzas'>('overview')

// En el render:
{activeTab === 'finanzas' && (
  <div>
    <h2 className="text-2xl font-bold mb-6">Dashboard Financiero</h2>
    <FinancialDashboard />
  </div>
)}
```

### Características del Panel

1. **Solo accesible para Admin**: Protegido por middleware
2. **Datos en tiempo real**: Se actualiza automáticamente
3. **Filtros y búsqueda**: Por fecha, productor, estado
4. **Exportación**: Descargar reportes en CSV/Excel
5. **Alertas visuales**: Colores para indicar problemas
6. **Responsive**: Funciona en móvil y desktop

## Tiempo Estimado de Implementación

- **Plazo de liquidación**: 2-3 horas
- **Gastos operativos**: 4-5 horas
- **Validaciones críticas**: 6-8 horas
- **Panel financiero admin**: 8-10 horas
- **Total**: ~20-26 horas de desarrollo
