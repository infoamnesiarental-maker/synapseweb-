# Ejecutar Verificación Automática de Tests

## 🎯 Objetivo

Este script verifica automáticamente los tests más importantes sin necesidad de hacer pagos reales.

---

## 📋 Pasos para Ejecutar

### 1. Ir a Supabase Dashboard

1. Abrir: https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a: **SQL Editor** (menú lateral)

### 2. Ejecutar el Script

1. Hacer clic en **New Query**
2. Abrir el archivo: `docs/VERIFICACION_AUTOMATICA_TESTS.sql`
3. Copiar TODO el contenido
4. Pegar en el SQL Editor
5. Hacer clic en **Run** (o presionar `Ctrl+Enter`)

### 3. Revisar los Resultados

El script ejecutará múltiples verificaciones y mostrará resultados con:
- ✅ = Correcto
- ❌ = Error (necesita atención)
- ⚠️ = Advertencia (puede ser normal)

---

## 📊 Qué Verifica el Script

### TEST 0: Migraciones
- ✅ Verifica que las tablas `webhook_logs` y `audit_logs` existen
- ✅ Verifica la estructura de las tablas

### TEST 1: RLS Policies
- ✅ Verifica que RLS está habilitado
- ✅ Verifica que las políticas están configuradas

### TEST 2: Integridad de Datos
- ✅ No hay compras completadas sin transferencia
- ✅ No hay transferencias de compras fallidas
- ✅ No hay tickets de compras fallidas

### TEST 3: Idempotencia
- ✅ No hay webhooks duplicados (mismo payment_id procesado múltiples veces)
- ✅ Todos los payment_id son únicos

### TEST 4: Auditoría
- ✅ Hay registros de auditoría para cambios de estado
- ✅ Los cambios tienen old_value y new_value

### TEST 5: Transferencias
- ✅ Los montos de transferencias son correctos (base_amount)
- ✅ Las fechas scheduled_at son correctas (240 horas después)
- ✅ Las transferencias de reembolsos están canceladas

### TEST 6: Protección de Datos
- ✅ Las vistas públicas no exponen datos sensibles
- ✅ La vista admin existe

### TEST 7: Estadísticas
- ✅ Resumen de compras por estado
- ✅ Resumen de transferencias por estado
- ✅ Resumen de webhooks procesados
- ✅ Resumen de auditoría

### TEST 8: Constraints e Índices
- ✅ payment_id tiene UNIQUE constraint
- ✅ Los índices importantes existen

---

## 🎯 Resultados Esperados

### Si TODO está bien:
- Todos los resultados muestran ✅
- No hay errores (❌)
- Las estadísticas muestran datos coherentes

### Si hay problemas:
- Aparecerán ❌ indicando qué necesita atención
- Revisar la sección específica del error
- Consultar la documentación correspondiente

---

## ⚠️ Notas Importantes

1. **Primera vez:** Si no hay datos aún (no hiciste pagos), algunos tests mostrarán "0 registros" que es normal.

2. **Tests que requieren datos reales:**
   - Estos tests verifican la estructura y lógica
   - Para tests con pagos reales, ver `11_TESTS_CRITICOS_PRODUCCION.md`

3. **Si hay errores:**
   - Revisar los mensajes específicos
   - Verificar que las migraciones se ejecutaron correctamente
   - Consultar la documentación de troubleshooting

---

## 🔄 Ejecutar Regularmente

Recomendación: Ejecutar este script:
- ✅ Después de cada migración
- ✅ Antes de ir a producción
- ✅ Semanalmente para verificar integridad
- ✅ Después de cambios importantes

---

## 📝 Próximos Pasos

Después de ejecutar este script:

1. Si todo está ✅ → Continuar con tests de pagos reales
2. Si hay ❌ → Resolver los problemas antes de continuar
3. Si hay ⚠️ → Revisar si es normal o necesita atención

Para tests con pagos reales, ver:
- `TESTS_PRINCIPALES_PRODUCCION.md` (tests principales)
- `11_TESTS_CRITICOS_PRODUCCION.md` (tests completos)
