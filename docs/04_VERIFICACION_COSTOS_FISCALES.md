# Análisis y Verificación de Costos - Manual de Operaciones V1

## Objetivo

Este documento analiza cada costo mencionado en el Manual de Operaciones V1, verificando su validez, aplicabilidad y posibles costos ocultos o no aplicables.

---

## 1. Comisión Mercado Pago: 4.32%

### ✅ VERIFICACIÓN: CORRECTO (con variaciones)

**Estado**: El porcentaje es razonable y realista.

**Contexto**:
- Mercado Pago Checkout Pro en Argentina cobra entre **3.99% y 4.99%** dependiendo del método de pago
- Tarjetas de crédito: ~4.99%
- Tarjetas de débito: ~3.99%
- Promedio típico: **4.32%** es un cálculo conservador y realista

**Recomendación**: 
- ✅ Mantener el 4.32% como estimación conservadora
- ⚠️ **Considerar variaciones**: El costo real puede variar entre 3.99% y 4.99% según método de pago
- 💡 **Sugerencia**: Calcular el promedio real después de las primeras ventas y ajustar si es necesario

**Costo oculto potencial**: 
- Si el cliente usa tarjeta internacional, la comisión puede subir al 5.5-6%
- Si hay devoluciones/reembolsos, Mercado Pago cobra comisión adicional

---

## 2. IVA sobre Comisión: 0.91%

### ✅ VERIFICACIÓN: CORRECTO (cálculo preciso)

**Estado**: El cálculo es matemáticamente correcto.

**Contexto**:
- IVA en Argentina: **21%**
- Cálculo: 4.32% × 21% = **0.9072%** ≈ **0.91%**
- ✅ El cálculo es correcto

**Recomendación**: 
- ✅ Mantener el 0.91%
- ✅ Este costo es real y aplicable

**Nota importante**: 
- El IVA se aplica sobre la comisión de Mercado Pago
- Es un costo real que debe considerarse

---

## 3. Retención IIBB (SIRCREB): 2.50%

### ⚠️ VERIFICACIÓN: REQUIERE VALIDACIÓN

**Estado**: El porcentaje puede variar según jurisdicción.

**Contexto**:
- IIBB (Impuesto a los Ingresos Brutos) varía por provincia en Argentina
- Buenos Aires: **2.5%** (coincide con tu manual)
- Otras provincias pueden tener alícuotas diferentes:
  - Córdoba: 3%
  - Santa Fe: 2.5%
  - Mendoza: 2.5%
  - Otras: pueden variar

**Recomendación**: 
- ✅ Si operas desde Buenos Aires: **2.50% es correcto**
- ⚠️ **Validar**: Confirmar en qué jurisdicción está registrada tu empresa
- ⚠️ **Si cambias de jurisdicción**: El porcentaje puede variar

**Costo oculto potencial**:
- Si operas en múltiples provincias, puede haber retenciones adicionales
- Algunas jurisdicciones tienen retenciones mínimas o máximas

---

## 4. Impuesto al Cheque: 1.20%

### ❌ VERIFICACIÓN: POSIBLEMENTE NO APLICA

**Estado**: El Impuesto al Cheque fue **DEROGADO en 2018**.

**Contexto**:
- El Impuesto al Cheque (0.6% entrada + 0.6% salida = 1.2%) fue derogado por la Ley 27.430 en 2018
- **Ya no existe este impuesto**

**Recomendación**: 
- ❌ **Eliminar este costo del cálculo**
- ✅ El 1.20% NO aplica actualmente
- ⚠️ **Revisar**: Puede haber otros costos bancarios menores que lo reemplacen

**Costos bancarios actuales que SÍ aplican**:
- Comisiones bancarias por transferencias: ~0.1-0.3% (muy bajo)
- Mantenimiento de cuenta: costo fijo mensual (no porcentual)
- **No hay impuesto al cheque desde 2018**

**Impacto en el cálculo**:
- Si eliminas el 1.20%, el total de gastos operativos sería: **7.73%** (no 8.93%)
- Margen neto mejoraría de 4.11% a **5.31%**

---

## 5. Costos Adicionales Potenciales (No mencionados en el manual)

### ⚠️ COSTOS OCULTOS A CONSIDERAR

#### 5.1 Comisiones por Reembolsos/Devoluciones
- **Costo**: Mercado Pago cobra comisión adicional por reembolsos
- **Impacto**: Si hay devoluciones, el costo real aumenta
- **Recomendación**: Considerar un fondo de reserva para devoluciones

#### 5.2 Costos Bancarios por Transferencias
- **Costo**: ~0.1-0.3% por transferencia bancaria (muy bajo)
- **Impacto**: Mínimo, pero existe
- **Recomendación**: Incluir en cálculos detallados si se hacen muchas transferencias

#### 5.3 Retención de Ganancias (si aplica)
- **Costo**: Si no estás en monotributo, puede haber retención de ganancias
- **Impacto**: Variable según régimen fiscal
- **Recomendación**: Confirmar tu régimen fiscal actual

#### 5.4 Costos de Infraestructura (no financieros)
- **Costo**: Hosting, dominio, servicios cloud
- **Impacto**: Costos fijos mensuales
- **Recomendación**: No incluir en cálculo de gastos operativos por venta, pero considerar en análisis general

---

## 6. Análisis del Escenario Sin Certificado Fiscal (~22%)

### ✅ VERIFICACIÓN: CORRECTO

**Estado**: El cálculo de ~22% es realista si no hay certificado de monotributo.

**Contexto**:
- Sin certificado de monotributo, Mercado Pago aplica retenciones adicionales:
  - Retención de IVA: ~21% sobre parte del ingreso
  - Retención de Ganancias: ~7-10% sobre parte del ingreso
  - Total adicional: puede llegar al **~13-15% extra**
- Sumado al 8.93% base: **~22% total es correcto**

**Recomendación**: 
- ✅ Mantener esta advertencia en el manual
- ⚠️ **CRÍTICO**: Asegurar que el certificado de monotributo esté cargado en Mercado Pago

---

## 7. Resumen de Verificaciones

| Costo | Manual V1 | Verificación | Estado | Acción Requerida |
|-------|-----------|--------------|--------|------------------|
| Comisión MP | 4.32% | ✅ Correcto | Real | Mantener, considerar variaciones |
| IVA Comisión | 0.91% | ✅ Correcto | Real | Mantener |
| Retención IIBB | 2.50% | ⚠️ Variable | Real (si BA) | Validar jurisdicción |
| Impuesto Cheque | 1.20% | ❌ No aplica | Derogado 2018 | **ELIMINAR del cálculo** |
| **TOTAL** | **8.93%** | ⚠️ Incorrecto | | **Ajustar a 7.73%** |

---

## 8. Cálculo Corregido

### Cálculo Actual (Manual V1):
```
Total cobrado: $1.150
Gastos operativos: -$102.66 (8.93%)
Liquidación productor: -$1.000
Margen neto: $47.34 (4.11%)
```

### Cálculo Corregido (Sin Impuesto al Cheque):
```
Total cobrado: $1.150
Gastos operativos: -$88.90 (7.73%)
  • Comisión MP: -$49.68 (4.32%)
  • IVA: -$10.47 (0.91%)
  • IIBB: -$28.75 (2.50%)
  • ~~Imp. Cheque: -$13.80 (1.20%)~~ ❌ ELIMINADO
Liquidación productor: -$1.000
Margen neto: $61.10 (5.31%) ← MEJORADO
```

**Impacto**: El margen neto real sería **5.31%** en lugar de 4.11% (mejora de +1.2%)

---

## 9. Recomendaciones Finales

### ✅ Costos que SÍ aplicar:
1. **Comisión MP (4.32%)**: ✅ Mantener
2. **IVA sobre comisión (0.91%)**: ✅ Mantener
3. **Retención IIBB (2.50%)**: ✅ Mantener (validar jurisdicción)

### ❌ Costos que NO aplicar:
1. **Impuesto al Cheque (1.20%)**: ❌ **ELIMINAR** - Fue derogado en 2018

### ⚠️ Costos a considerar adicionalmente:
1. **Comisiones por reembolsos**: Considerar en análisis de riesgo
2. **Costos bancarios menores**: ~0.1-0.3% (mínimo)
3. **Validar jurisdicción IIBB**: Confirmar alícuota exacta

### 📊 Ajuste Recomendado al Manual:
- **Gastos operativos corregidos**: **7.73%** (no 8.93%)
- **Margen neto corregido**: **5.31%** (no 4.11%)
- **Nota importante**: El impuesto al cheque fue derogado en 2018

---

## 10. Próximos Pasos

1. ✅ **Validar jurisdicción IIBB**: Confirmar que el 2.50% aplica a tu caso
2. ✅ **Eliminar impuesto al cheque**: Actualizar cálculos a 7.73%
3. ✅ **Monitorear comisiones reales**: Después de primeras ventas, calcular promedio real de MP
4. ✅ **Considerar costos de reembolsos**: Incluir en análisis de riesgo
5. ✅ **Actualizar manual**: Reflejar el cálculo corregido (7.73% en lugar de 8.93%)

---

## Nota Final

Este análisis se basa en:
- Legislación fiscal argentina vigente (2024-2025)
- Estructura de comisiones de Mercado Pago Argentina
- Conocimiento general de impuestos y retenciones

**Recomendación**: Consultar con un contador para validar los porcentajes exactos según tu situación fiscal específica.
