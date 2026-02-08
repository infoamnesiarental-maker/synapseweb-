# Análisis de Alineación: Manual de Operaciones V1 vs. Lógica Actual del Software

## Resumen Ejecutivo

El documento del Manual de Operaciones V1 define un modelo de negocio más completo y detallado que la implementación actual. Hay **inconsistencias críticas** que deben corregirse antes de producción.

## Comparación Detallada

### ✅ Lo que SÍ está alineado

1. **Comisión del 15%**: ✅ Implementada correctamente
   - Código: `COMMISSION_RATE = 0.15` en `lib/utils/pricing.ts`
   - Manual: 15% de Service Charge

2. **Cálculo de precio total**: ✅ Correcto
   - Código: `totalPrice = basePrice + (basePrice * 0.15)`
   - Manual: Entrada + 15%

3. **Liquidación al productor**: ✅ Correcto
   - Código: `amount: totalBreakdown.basePrice` (solo precio base)
   - Manual: Liquidación para el Productor = Precio base

### ⚠️ Inconsistencias Críticas

#### 1. Plazo de Liquidación (CRÍTICO)

**Manual V1**: 
- No transferir antes de **240 horas (10 días)** desde la compra
- Plazo basado en liberación de Mercado Pago

**Código Actual**:
```typescript
// useCheckout.ts línea 157
const scheduledAt = new Date(endDate.getTime() + 48 * 60 * 60 * 1000) // 48 horas después
```
- Programa transferencia **48 horas después del FIN del evento**
- No considera el plazo de liberación de Mercado Pago
- No valida fecha de compra

**Impacto**: ⚠️ **ALTO** - Puede generar bache financiero si se transfiere antes de que MP libere el dinero.

**Solución requerida**:
```typescript
// Debe ser: 240 horas (10 días) desde purchase.created_at
const MIN_SETTLEMENT_HOURS = 240
const purchaseDate = new Date(purchase.created_at)
const minSettlementDate = new Date(purchaseDate.getTime() + MIN_SETTLEMENT_HOURS * 60 * 60 * 1000)
```

#### 2. Cálculo de Gastos Operativos (CRÍTICO)

**Manual V1**: 
- Gastos operativos: **8.93%** del total cobrado
  - Comisión MP: 4.32%
  - IVA sobre Comisión: 0.91%
  - Retención IIBB: 2.50%
  - Impuesto al Cheque: 1.20%

**Código Actual**:
- Solo considera comisión de Mercado Pago (~4.1%)
- No calcula IVA, IIBB, ni Impuesto al Cheque
- No registra gastos operativos totales

**Impacto**: ⚠️ **ALTO** - El margen neto real será menor de lo esperado. El sistema no está calculando todos los costos.

**Solución requerida**:
```typescript
function calculateOperatingCosts(totalAmount: number) {
  return {
    mercadopagoCommission: totalAmount * 0.0432,  // 4.32%
    ivaCommission: totalAmount * 0.0091,          // 0.91%
    iibbRetention: totalAmount * 0.0250,          // 2.50%
    checkTax: totalAmount * 0.0120,                // 1.20%
    total: totalAmount * 0.0893,                  // 8.93%
  }
}
```

#### 3. Campos en Base de Datos (MEDIO)

**Manual V1 requiere**:
- `operating_costs`: Gastos operativos totales
- `mercadopago_commission`: Comisión MP
- `iva_commission`: IVA sobre comisión
- `iibb_retention`: Retención IIBB
- `check_tax`: Impuesto al cheque
- `net_margin`: Margen neto de Synapse

**Código Actual**:
- Tiene `commission_amount` (comisión Synapse)
- Tiene `base_amount` (precio base)
- Tiene `total_amount` (total cobrado)
- **FALTA**: Campos para gastos operativos desglosados
- **FALTA**: Campo para margen neto

**Impacto**: ⚠️ **MEDIO** - No se puede hacer análisis financiero preciso sin estos campos.

#### 4. Validaciones Críticas (ALTO)

**Manual V1 requiere**:
1. Validación de certificado de monotributo (sin esto, costos suben al ~22%)
2. Validación de match de titularidad (cuenta bancaria = cuenta MP)
3. Validación de plazo mínimo (240 horas)

**Código Actual**:
- ❌ No valida certificado fiscal
- ❌ No valida match de titularidad
- ❌ No valida plazo mínimo correctamente

**Impacto**: ⚠️ **ALTO** - Sin estas validaciones, el sistema puede operar en pérdida o tener problemas legales.

## Tabla Comparativa

| Aspecto | Manual V1 | Código Actual | Estado |
|---------|-----------|---------------|--------|
| Comisión 15% | ✅ Requerido | ✅ Implementado | ✅ Alineado |
| Precio total | ✅ base + 15% | ✅ base + 15% | ✅ Alineado |
| Liquidación productor | ✅ Precio base | ✅ Precio base | ✅ Alineado |
| Plazo liquidación | ⚠️ 240h desde compra | ❌ 48h desde evento | ❌ **Desalineado** |
| Gastos operativos | ⚠️ 8.93% completo | ❌ Solo MP ~4.1% | ❌ **Desalineado** |
| Campos BD gastos | ⚠️ Requeridos | ❌ Faltan | ❌ **Desalineado** |
| Validación certificado | ⚠️ Requerida | ❌ No existe | ❌ **Desalineado** |
| Validación titularidad | ⚠️ Requerida | ❌ No existe | ❌ **Desalineado** |
| Validación plazo | ⚠️ Requerida | ❌ Incorrecta | ❌ **Desalineado** |

## Acciones Requeridas (Prioridad)

### Prioridad ALTA (Bloqueantes para producción)

1. **Corregir cálculo de plazo de liquidación**
   - Cambiar de "48h después del evento" a "240h después de la compra"
   - Validar que no se pueda transferir antes del plazo mínimo

2. **Implementar cálculo completo de gastos operativos**
   - Agregar cálculo de IVA, IIBB, Impuesto al Cheque
   - Registrar todos los costos en base de datos

3. **Agregar validación de plazo mínimo**
   - Bloquear transferencias antes de 240 horas
   - Mostrar alertas si se intenta transferir antes

### Prioridad MEDIA (Importantes para operación)

4. **Agregar campos de gastos operativos a BD**
   - Migración SQL para nuevos campos
   - Actualizar tipos TypeScript

5. **Implementar validación de certificado fiscal**
   - Al configurar credenciales, verificar estado fiscal
   - Alertar si no hay certificado (costos suben al ~22%)

6. **Implementar validación de match de titularidad**
   - Validar al configurar cuenta bancaria
   - Bloquear transferencias si no hay match

### Prioridad BAJA (Mejoras)

7. **Dashboard de análisis financiero**
   - Mostrar gastos operativos desglosados
   - Mostrar margen neto por transacción
   - Alertas si margen neto es negativo

## Recomendación

**NO pasar a producción** hasta corregir las inconsistencias de prioridad ALTA. El sistema actual puede generar:
- Baches financieros (transferir antes de que MP libere)
- Cálculos incorrectos de margen (no considera todos los costos)
- Pérdidas no detectadas (sin validaciones críticas)

## Próximos Pasos

1. Revisar y aprobar este análisis
2. Crear tareas para corregir inconsistencias de prioridad ALTA
3. Implementar correcciones antes de migración a producción
4. Validar con casos de prueba usando el ejemplo del manual ($1.000)
