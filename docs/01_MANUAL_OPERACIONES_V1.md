# Manual de Operaciones V1: "Modelo de Recaudación por Terceros"

## 1. El Objetivo del Negocio

Actuar como un intermediario tecnológico y de cobro entre un Organizador de Eventos (Productor) y un Cliente Final, cobrando un 15% de Service Charge que debe cubrir todos los costos financieros e impositivos, dejando una ganancia neta positiva para la plataforma sin trasladar costos ocultos al productor.

## 2. Arquitectura Financiera (Ticket de Referencia: $1.000)

Para esta fase, la plataforma utiliza Mercado Pago Checkout Pro con liberación a 10 días.

### A. Desglose del "Gasto Operativo" (Piso del 7,73%)

Cualquier ingreso debe ser procesado entendiendo que el 7,73% del total cobrado desaparece automáticamente por la "aspiradora" fiscal y financiera:

| Concepto | % sobre el Total ($1.150) | Impacto Real |
|----------|-------------------------|--------------|
| Comisión Mercado Pago | 4,32% | Costo por uso de pasarela. |
| IVA sobre Comisión | 0,91% | Impuesto al servicio de MP. |
| Retención IIBB (SIRCREB) | 2,50% | Retención sobre ventas (Promedio Argentina). |
| **TOTAL GASTOS** | **7,73%** | **$88,90** |

**Nota importante**: El Impuesto al Cheque (1,20%) fue derogado en 2018 por la Ley 27.430, por lo que ya no aplica. Los costos bancarios por transferencias son mínimos (~0,1-0,3%) y no se incluyen en este cálculo.

### B. El Resultado Neto (Tu Ganancia)

- **Cobro Final al Cliente**: $1.150 (Entrada + 15%).
- **Costo Total (A+B+C)**: $88,90.
- **Liquidación para el Productor**: $1.000.
- **Margen Neto Ticketera**: $61,10 (5,31% del total cobrado).

## 3. Puntos de Atención Crítica (Red Flags)

### Estado Fiscal del Titular

Si la cuenta de Mercado Pago no tiene cargado el Certificado de Monotributo, los gastos suben del 7,73% al ~22% (por retenciones de IVA y Ganancias a no inscriptos). Esto genera pérdida neta inmediata.

### El "Match" de Titularidad

La cuenta bancaria de salida debe ser de la misma persona/empresa que la cuenta de Mercado Pago para que el banco no bloquee fondos o aplique alícuotas de impuestos más altas.

### Manejo de Expectativas (Plazos)

El sistema **NO debe permitir liquidaciones antes de las 240 horas (10 días)** de realizada la compra. Pagar antes de la liberación de MP rompe la cadena de pagos y genera un bache financiero.

## 4. Validaciones Críticas del Sistema

### 4.1 Validación de Plazo Mínimo

**Regla**: No se puede transferir dinero a productoras antes de 10 días (240 horas) desde la fecha de compra.

**Implementación requerida**:
- Validar `purchase.created_at + 240 horas <= fecha_actual` antes de procesar transferencia
- Bloquear transferencias programadas antes de este plazo
- Mostrar alerta si se intenta transferir antes del plazo mínimo

### 4.2 Validación de Certificado Fiscal

**Regla**: Verificar que la cuenta de Mercado Pago tenga certificado de monotributo cargado.

**Implementación requerida**:
- Al configurar credenciales de producción, validar estado fiscal
- Alertar si no hay certificado (los costos suben al ~22%)
- Documentar requisito en proceso de onboarding

### 4.3 Validación de Match de Titularidad

**Regla**: La cuenta bancaria debe ser de la misma persona/empresa que la cuenta de Mercado Pago.

**Implementación requerida**:
- Validar titularidad al configurar cuenta bancaria
- Bloquear transferencias si no hay match
- Documentar requisito en configuración de productora

## 5. Cálculo de Costos Operativos

### Fórmula de Gastos Operativos

```typescript
// Sobre el total cobrado (precio_base + comisión_15%)
const totalCobrado = precioBase + (precioBase * 0.15)

// Desglose de gastos (7.73% del total cobrado)
const comisionMP = totalCobrado * 0.0432      // 4.32%
const ivaComision = totalCobrado * 0.0091     // 0.91%
const retencionIIBB = totalCobrado * 0.0250    // 2.50%
// NOTA: Impuesto al Cheque fue derogado en 2018, ya no aplica

const gastosOperativos = comisionMP + ivaComision + retencionIIBB
// Total: 7.73% del total cobrado
```

### Cálculo de Margen Neto

```typescript
const totalCobrado = precioBase + (precioBase * 0.15)
const gastosOperativos = totalCobrado * 0.0773
const liquidacionProductor = precioBase
const margenNeto = totalCobrado - gastosOperativos - liquidacionProductor
// Ejemplo: $1.150 - $88.90 - $1.000 = $61.10 (5.31%)
```

## 6. Ejemplo Práctico (Ticket $1.000)

```
┌─────────────────────────────────────────────┐
│  Cliente paga: $1.150                       │
│  - Precio base: $1.000                      │
│  - Comisión Synapse (15%): $150             │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Gastos Operativos (7.73%): -$88.90         │
│  - Comisión MP (4.32%): -$49.68             │
│  - IVA Comisión (0.91%): -$10.47           │
│  - Retención IIBB (2.50%): -$28.75         │
│  (Impuesto al Cheque derogado en 2018)      │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Resultado:                                  │
│  - Total recibido: $1.150                   │
│  - Gastos operativos: -$88.90               │
│  - Liquidación productor: -$1.000          │
│  ────────────────────────────────────────  │
│  - Margen neto Synapse: $61.10 (5.31%)     │
└─────────────────────────────────────────────┘
```

## 7. Implementación en el Sistema

### 7.1 Campos Requeridos en Base de Datos

La tabla `purchases` debe registrar:

- `total_amount`: Total cobrado al cliente ($1.150)
- `base_amount`: Precio base de productora ($1.000)
- `commission_amount`: Comisión Synapse ($150)
- `net_amount`: Monto neto recibido después de gastos operativos
- `operating_costs`: Gastos operativos totales ($88.90)
  - `mercadopago_commission`: Comisión MP ($49.68)
  - `iva_commission`: IVA sobre comisión ($10.47)
  - `iibb_retention`: Retención IIBB ($28.75)
  - ~~`check_tax`: Impuesto al cheque~~ (derogado en 2018, ya no aplica)
- `net_margin`: Margen neto de Synapse ($61.10)
- `money_release_date`: Fecha de liberación de Mercado Pago (10 días)
- `settlement_status`: Estado de liquidación

### 7.2 Validación de Plazo Mínimo

```typescript
// No transferir antes de 240 horas (10 días)
const MIN_SETTLEMENT_HOURS = 240

function canTransfer(purchase: Purchase): boolean {
  const purchaseDate = new Date(purchase.created_at)
  const minSettlementDate = new Date(purchaseDate.getTime() + MIN_SETTLEMENT_HOURS * 60 * 60 * 1000)
  return new Date() >= minSettlementDate
}
```

### 7.3 Cálculo de Gastos Operativos

```typescript
function calculateOperatingCosts(totalAmount: number): OperatingCosts {
  return {
    mercadopagoCommission: totalAmount * 0.0432,  // 4.32%
    ivaCommission: totalAmount * 0.0091,          // 0.91%
    iibbRetention: totalAmount * 0.0250,          // 2.50%
    // checkTax eliminado: Impuesto al Cheque fue derogado en 2018
    total: totalAmount * 0.0773,                  // 7.73%
  }
}
```

## 8. Notas Importantes

1. **El 7.73% es un piso mínimo**: Si no hay certificado de monotributo, los costos pueden subir al ~22%
2. **El Impuesto al Cheque fue derogado**: Este impuesto (1.20%) fue eliminado en 2018 por la Ley 27.430, por lo que ya no aplica
3. **Los 10 días son críticos**: No se puede adelantar dinero antes de la liberación de Mercado Pago
4. **El match de titularidad es obligatorio**: Sin esto, el banco puede bloquear fondos
5. **El margen neto debe ser positivo**: Si los gastos superan el 15% de comisión, hay pérdida
6. **Validar jurisdicción IIBB**: El 2.50% aplica para Buenos Aires; otras jurisdicciones pueden variar

## 9. Próximos Pasos de Implementación

1. ✅ Comisión del 15% implementada
2. ⚠️ Agregar cálculo de gastos operativos completos (7.73%)
3. ⚠️ Implementar validación de plazo mínimo (240 horas)
4. ⚠️ Agregar validación de certificado fiscal
5. ⚠️ Agregar validación de match de titularidad
6. ⚠️ Actualizar campos en base de datos para registrar todos los costos
7. ⚠️ Eliminar referencias al Impuesto al Cheque en código (ya no aplica)
