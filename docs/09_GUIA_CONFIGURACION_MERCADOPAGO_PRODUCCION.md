# Guía Completa: Configuración Mercado Pago en Producción

## ✅ Estado: Configuración Inicial Completada

Esta guía documenta todo el proceso de configuración de Mercado Pago en producción para Synapse Ticketera.

---

## 📋 Checklist de Configuración Completada

### ✅ Paso 1: Configuración en Panel de Mercado Pago

- [x] **Categoría del negocio**: "Organización de eventos"
- [x] **Tipo de negocio**: "Sin local a la calle"
- [x] **Nombre para reconocimiento**: "TICKETSYNAPSE"
- [x] **Plazo de liquidación**: 10 días (4.39% + IVA)
- [x] **Rubro configurado**: "Organización de eventos"

**Ubicación en MP**: Tu Negocio → Datos de tu negocio → Costos y cuotas → Checkout

---

### ✅ Paso 2: Variables de Entorno en Vercel

- [x] **MERCADOPAGO_ACCESS_TOKEN**: Actualizado con token de producción
- [x] **NEXT_PUBLIC_APP_URL**: Configurado
- [x] **NEXT_PUBLIC_SUPABASE_URL**: Configurado
- [x] **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Configurado
- [x] **RESEND_API_KEY**: Configurado

**Nota**: No se requiere `MERCADOPAGO_PUBLIC_KEY` (no se usa en el código)

---

## 🔄 Pasos Siguientes (Pendientes)

### Paso 3: Verificar CUIT en Mercado Pago ⚠️ RECOMENDADO

**Actualización importante (Septiembre 2024):**
- Desde el 1 de septiembre de 2024, ARCA (ex AFIP) eliminó las retenciones de IVA (21%) y Ganancias (2%) en Mercado Pago
- Esto aplica incluso si no tenés el CUIT cargado
- **Ya NO hay riesgo de costos al 31%** por falta de CUIT

**¿Por qué aún es recomendable cargar el CUIT?**
- Identificación correcta de tu negocio ante Mercado Pago
- Mejor gestión de retenciones de IIBB (si aplican)
- Configuración correcta de condición fiscal (Monotributista, Responsable Inscripto)
- Evita problemas futuros si cambian las políticas
- Mejor experiencia y soporte de Mercado Pago

**Dónde hacerlo:**
1. Ir a: https://www.mercadopago.com.ar
2. Ruta: **Tu Perfil → Datos Personales → Inscripciones Impositivas**
3. Verificar:
   - [ ] CUIT cargado
   - [ ] Constancia de Monotributo subida
   - [ ] Estado: "Verificado" o "Aprobado"

**Si no está cargado:**
1. Descargar constancia de Monotributo desde AFIP
2. Subir el PDF en Mercado Pago
3. Esperar verificación (1-3 días hábiles)

**Nota**: Aunque no es crítico para evitar retenciones de IVA/Ganancias (ya no aplican), es recomendable tenerlo cargado para una configuración completa.

---

### Paso 4: Configurar Webhook en Producción

**Dónde hacerlo:**
1. Ir a: https://www.mercadopago.com.ar/developers
2. Iniciar sesión con tu cuenta
3. Ir a tu aplicación (o crear una si no tenés)
4. Ruta: **Tu aplicación → Webhooks** o **Notificaciones IPN**
5. Agregar nueva URL:
   - **URL**: `https://tu-dominio.vercel.app/api/mercadopago/webhook`
   - **Eventos a escuchar**:
     - `payment`
     - `merchant_order`
6. Guardar cambios

**Verificación:**
- El webhook debe estar activo antes de la primera venta real
- Mercado Pago enviará notificaciones cuando haya pagos aprobados
- Tu app actualizará automáticamente el `payment_status` y calculará los gastos operativos

---

### Paso 5: Verificar Datos Bancarios

**Dónde hacerlo:**
1. Ir a: https://www.mercadopago.com.ar
2. Ir a la pestaña **"Cuenta"** (junto a "Negocio")
3. Hacé clic en **"Información de tu perfil"** (primera tarjeta, icono de persona con documento)
4. Dentro de esa sección, buscá:
   - **"Datos Bancarios"** o **"CBU/CVU"**
   - **"Inscripciones Impositivas"** (para verificar CUIT también)
5. Verificar:
   - [ ] CBU/CVU cargado
   - [ ] Titular de la cuenta bancaria = mismo que cuenta MP
   - [ ] Datos coinciden exactamente (nombre, CUIT)

**Si no encontrás "Datos Bancarios":**
- Puede estar en otra sección del menú
- O puede que aún no lo hayas configurado (en ese caso, agregalo cuando lo necesites)

**Por qué es importante:**
- **Para retirar dinero de Mercado Pago a tu cuenta bancaria**: Necesitás una cuenta bancaria configurada
- **Para transferir a productores**: Podés hacerlo de dos formas:
  1. **Desde Mercado Pago directamente** (usando la API de Mercado Pago para transferir a CBU/CVU de productores) - NO necesitás cuenta bancaria propia
  2. **Desde tu cuenta bancaria** (retirar de MP a tu banco, luego transferir a productores) - SÍ necesitás cuenta bancaria propia
- **Match de titularidad**: Si transferís desde tu cuenta bancaria a una cuenta que no es tuya, el banco puede:
  - Retener fondos
  - Pedir justificación
  - Bloquear transferencias
- **Nota**: No es crítico para hacer la primera venta de prueba. Podés transferir a productores directamente desde Mercado Pago sin necesidad de cuenta bancaria propia

---

### Paso 6: Verificar Deploy en Vercel

**Qué verificar:**
1. Ir a tu proyecto en Vercel
2. Verificar que el último deploy fue exitoso (verde)
3. Verificar que las variables de entorno están actualizadas
4. Verificar que la app está funcionando en producción

**Si hay errores:**
- Revisar logs en Vercel
- Verificar que `MERCADOPAGO_ACCESS_TOKEN` es de producción (debe empezar con `APP_USR-`)
- Verificar que todas las variables de entorno están configuradas

---

### Paso 7: Hacer Venta de Prueba

**Antes de hacer la primera venta real:**
1. Verificar que el CUIT está cargado y verificado
2. Verificar que el webhook está configurado
3. Verificar que el deploy fue exitoso

**Venta de prueba:**
1. Crear un evento de prueba
2. Hacer una compra pequeña ($10-50)
3. Completar el pago (puede ser con tarjeta real o de prueba)

**Qué verificar después:**
1. ✅ Se crea la compra en tu BD
2. ✅ El webhook actualiza `payment_status` a "completed"
3. ✅ Se calculan los campos financieros:
   - `operating_costs` (7.83% del total)
   - `mercadopago_commission` (4.39% del total)
   - `iva_commission` (0.92% del total)
   - `iibb_retention` (2.50% del total)
   - `net_margin` (5.22% del total)
   - `money_release_date` (10 días después de la compra)

---

## 📊 Configuración Final Esperada

### Tasas y Costos (Checkout - 10 días)

| Concepto | Porcentaje | Ejemplo ($10 ticket) |
|----------|------------|----------------------|
| Comisión MP | 4.39% | $0.50 |
| IVA sobre comisión | 0.92% | $0.11 |
| Retención IIBB | 2.50% | $0.29 |
| **Total gastos** | **7.83%** | **$0.90** |

### Margen Neto Esperado

| Concepto | Monto | % del Total | % de tu Comisión (15%) |
|----------|-------|-------------|------------------------|
| Total cobrado | $11.50 | 100% | - |
| Gastos operativos | -$0.90 | 7.83% | 60.00% |
| Pago a productora | -$10.00 | 86.96% | - |
| **Tu ganancia neta** | **$0.60** | **5.22%** | **40.00%** |

---

## 🔍 Verificación Post-Configuración

### En Mercado Pago:
- [ ] CUIT cargado y verificado
- [ ] Constancia de Monotributo subida
- [ ] Rubro: "Organización de eventos"
- [ ] Tipo: "Sin local a la calle"
- [ ] Plazo: 10 días (4.39%)
- [ ] Webhook configurado con URL de producción
- [ ] Datos bancarios verificados

### En Vercel:
- [ ] `MERCADOPAGO_ACCESS_TOKEN` actualizado (producción)
- [ ] Deploy exitoso
- [ ] App funcionando en producción

### En tu App:
- [ ] Webhook recibe notificaciones
- [ ] Cálculos financieros correctos
- [ ] Campos de BD se actualizan correctamente

---

## ⚠️ Recordatorios Importantes

1. **NUNCA** hagas el primer cobro real sin tener CUIT cargado y verificado
2. **SIEMPRE** verifica que el nombre y CUIT coincidan exactamente entre MP y banco
3. **REVISA** periódicamente que las configuraciones sigan activas
4. **MONITOREA** las primeras ventas para verificar que todo funciona correctamente

---

## 📞 Contactos Útiles

- **Mercado Pago Soporte**: https://www.mercadopago.com.ar/developers/es/support
- **AFIP**: https://www.afip.gob.ar | Tel: 0800-999-2347
- **ARBA (Buenos Aires)**: https://www.arba.gov.ar

---

## 🚀 Próximos Pasos Después de Configurar

1. ✅ Verificar CUIT en Mercado Pago
2. ✅ Configurar webhook en producción
3. ✅ Verificar datos bancarios
4. ✅ Hacer venta de prueba
5. ✅ Monitorear primeras ventas reales
6. ✅ Verificar cálculos financieros

---

**Última actualización**: 2025
**Versión**: 1.0
**Estado**: Configuración inicial completada, pendiente verificación CUIT y webhook
