# 🧪 Guía de Testing - Mis Compras

Esta guía te ayudará a probar paso a paso la nueva funcionalidad de **Mis Compras** y verificar que todo funcione correctamente.

---

## 📋 Pre-requisitos

Antes de comenzar, asegúrate de tener:

1. ✅ El servidor de desarrollo corriendo (`npm run dev`)
2. ✅ Una cuenta de usuario registrada y autenticada
3. ✅ Al menos una compra realizada (si no tienes, sigue los pasos para crear una)

---

## 🎯 Paso 1: Verificar que el servidor esté corriendo

```bash
# En la terminal, verifica que el servidor esté activo
npm run dev
```

**Resultado esperado:**
- El servidor debe estar corriendo en `http://localhost:3000`
- No debe haber errores en la consola del servidor

---

## 🎯 Paso 2: Autenticarse como usuario

1. Abre tu navegador y ve a `http://localhost:3000`
2. Haz clic en **"Iniciar Sesión"** o ve directamente a `/login`
3. Inicia sesión con una cuenta de usuario (no productora)

**Resultado esperado:**
- Debes poder iniciar sesión sin errores
- Debes ser redirigido a la página principal o dashboard

**Si no tienes una cuenta:**
- Ve a `/register` y crea una cuenta nueva
- Completa el registro básico

---

## 🎯 Paso 3: Realizar una compra (si no tienes compras)

Si ya tienes compras, puedes saltar este paso. Si no, sigue estos pasos:

1. Ve a la página de eventos: `/eventos`
2. Selecciona un evento publicado
3. Haz clic en **"Comprar Entradas"**
4. Completa el proceso de checkout:
   - Selecciona cantidad de tickets
   - Completa datos del comprador
   - Confirma la compra

**Resultado esperado:**
- Debes poder completar el checkout sin errores
- Debes ser redirigido a `/checkout/success?purchaseId=...`
- La compra debe aparecer en la base de datos

**Verificar en Supabase:**
```sql
-- Verifica que la compra se haya creado
SELECT * FROM purchases 
WHERE user_id = 'TU_USER_ID' 
ORDER BY created_at DESC 
LIMIT 1;

-- Verifica que los tickets se hayan creado
SELECT * FROM tickets 
WHERE purchase_id = 'ID_DE_LA_COMPRA';
```

---

## 🎯 Paso 4: Acceder a Mis Compras

1. Inicia sesión como usuario
2. Ve a `/mis-compras` o haz clic en el enlace "Mis Compras" desde el menú

**Resultado esperado:**
- La página debe cargar sin errores
- Debes ver el título "Mis Compras"
- Si tienes compras, deben aparecer listadas
- Si no tienes compras, debe aparecer el mensaje "No tienes compras aún"

**Errores comunes a verificar:**
- ❌ Error 404: Verifica que la ruta `/mis-compras` exista
- ❌ Error de autenticación: Verifica que estés logueado
- ❌ Página en blanco: Abre la consola del navegador (F12) y revisa errores

---

## 🎯 Paso 5: Verificar lista de compras

Si tienes compras, verifica:

1. **Cada compra debe mostrar:**
   - ✅ Nombre del evento
   - ✅ Badge de estado (Completado, Pendiente, etc.)
   - ✅ Fecha del evento
   - ✅ Lugar del evento
   - ✅ Total pagado
   - ✅ Botón "Ver Detalles"

**Resultado esperado:**
- Todas las compras deben estar visibles
- La información debe ser correcta
- Los badges de estado deben tener el color correcto

---

## 🎯 Paso 6: Expandir detalles de una compra

1. Haz clic en el botón **"Ver Detalles"** de una compra
2. Verifica que se expanda mostrando:
   - ✅ Número de compra
   - ✅ Fecha de compra
   - ✅ Cantidad de entradas
   - ✅ Lista de tickets con QR codes
   - ✅ Botón "Descargar PDF"
   - ✅ Botón "Solicitar Devolución" (solo si está completada)

**Resultado esperado:**
- La sección debe expandirse suavemente
- Toda la información debe ser visible
- Los QR codes deben renderizarse correctamente

**Errores comunes:**
- ❌ QR codes no se muestran: Verifica que `qrcode.react` esté instalado
- ❌ Información incorrecta: Verifica las queries en `usePurchases.ts`

---

## 🎯 Paso 7: Verificar QR codes

Para cada ticket en la lista expandida:

1. **Verifica que el QR code:**
   - ✅ Se muestre correctamente (cuadrado blanco con código)
   - ✅ Sea escaneable (puedes probar con tu celular)
   - ✅ Tenga el código QR visible debajo

2. **Verifica la información del ticket:**
   - ✅ Tipo de ticket (General, VIP, etc.)
   - ✅ Número de ticket único
   - ✅ Código QR único

**Resultado esperado:**
- Los QR codes deben ser únicos para cada ticket
- Deben ser legibles y escaneables
- El formato debe ser consistente

**Probar escaneo:**
- Usa la app de cámara de tu celular
- Escanea el QR code de la pantalla
- Debe mostrar el código alfanumérico

---

## 🎯 Paso 8: Probar descarga de PDF

1. Con una compra expandida, haz clic en **"Descargar PDF"**
2. Espera a que se genere el PDF (puede tardar unos segundos)
3. Verifica que se descargue el archivo

**Resultado esperado:**
- El PDF debe descargarse automáticamente
- El nombre del archivo debe ser: `synapse-compra-XXXXXXXX.pdf`
- El PDF debe contener:
  - ✅ Header con "SYNAPSE"
  - ✅ Información de la compra
  - ✅ Información del evento
  - ✅ Todos los tickets con QR codes reales
  - ✅ Códigos QR escaneables en el PDF

**Errores comunes:**
- ❌ Error al generar PDF: Verifica que `jspdf` y `html2canvas` estén instalados
- ❌ QR codes no aparecen en PDF: Verifica la función `generateQRCodeImage`
- ❌ PDF en blanco: Verifica que `html2canvas` esté funcionando

**Verificar en el PDF descargado:**
- Abre el PDF
- Verifica que todos los tickets estén presentes
- Intenta escanear los QR codes del PDF con tu celular

---

## 🎯 Paso 9: Probar solicitud de devolución

1. Con una compra **completada** expandida, haz clic en **"Solicitar Devolución"**
2. Verifica que se abra un modal
3. Escribe un motivo en el textarea (ej: "No puedo asistir")
4. Haz clic en **"Enviar Solicitud"**

**Resultado esperado:**
- El modal debe abrirse correctamente
- Debes poder escribir en el textarea
- Al enviar, debe mostrar un mensaje de confirmación
- El modal debe cerrarse
- La solicitud debe guardarse en la base de datos

**Verificar en Supabase:**
```sql
-- Verifica que la solicitud se haya creado
SELECT * FROM refunds 
WHERE purchase_id = 'ID_DE_LA_COMPRA' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Errores comunes:**
- ❌ Modal no se abre: Verifica el estado `showRefundModal`
- ❌ Error al enviar: Verifica la consola del navegador (F12)
- ❌ No se guarda en BD: Verifica las políticas RLS de `refunds`

---

## 🎯 Paso 10: Verificar estados de carga

1. **Carga inicial:**
   - Al entrar a `/mis-compras`, debe mostrar "Cargando..." brevemente
   - Luego debe mostrar las compras o el empty state

2. **Carga de PDF:**
   - Al hacer clic en "Descargar PDF", puede tardar unos segundos
   - No debe haber errores en la consola

3. **Envío de devolución:**
   - El botón debe cambiar a "Enviando..." mientras se procesa
   - No debe poder hacer clic múltiples veces

**Resultado esperado:**
- Los estados de carga deben funcionar correctamente
- No debe haber errores en la consola del navegador

---

## 🎯 Paso 11: Verificar responsive design

1. **Desktop:**
   - Abre en una ventana grande (>1024px)
   - Verifica que el layout se vea bien
   - Las compras deben estar en columnas

2. **Tablet:**
   - Redimensiona a ~768px
   - Verifica que el layout se adapte
   - Los tickets deben seguir siendo legibles

3. **Mobile:**
   - Redimensiona a ~375px
   - Verifica que todo sea legible
   - Los botones deben ser táctiles
   - Los QR codes deben ser escaneables

**Resultado esperado:**
- El diseño debe adaptarse correctamente
- No debe haber elementos cortados
- Los textos deben ser legibles

---

## 🎯 Paso 12: Verificar manejo de errores

### 12.1. Usuario no autenticado

1. Cierra sesión
2. Intenta acceder directamente a `/mis-compras`

**Resultado esperado:**
- Debe redirigir a `/login`
- No debe mostrar errores

### 12.2. Sin compras

1. Inicia sesión con un usuario que no tenga compras
2. Ve a `/mis-compras`

**Resultado esperado:**
- Debe mostrar el empty state
- Debe mostrar el mensaje "No tienes compras aún"
- Debe tener un botón para ver eventos

### 12.3. Error de red

1. Desconecta tu internet
2. Intenta cargar `/mis-compras`

**Resultado esperado:**
- Debe mostrar un mensaje de error apropiado
- No debe crashear la aplicación

---

## 🎯 Paso 13: Verificar en la consola del navegador

Abre la consola del navegador (F12) y verifica:

1. **No debe haber errores:**
   - ❌ Errores de React
   - ❌ Errores de TypeScript
   - ❌ Errores de Supabase
   - ❌ Warnings importantes

2. **Puede haber warnings menores:**
   - ⚠️ Warnings de dependencias (no críticos)
   - ⚠️ Warnings de desarrollo (no críticos)

**Errores comunes a buscar:**
```
❌ "Cannot read property 'map' of undefined"
❌ "Network request failed"
❌ "Policy violation"
❌ "Invalid hook call"
```

---

## 🎯 Paso 14: Verificar en Supabase Dashboard

1. Ve a tu proyecto en Supabase
2. Verifica las tablas:

### Tabla `purchases`:
```sql
SELECT 
  id,
  user_id,
  event_id,
  total_amount,
  payment_status,
  created_at
FROM purchases
WHERE user_id = 'TU_USER_ID'
ORDER BY created_at DESC;
```

### Tabla `tickets`:
```sql
SELECT 
  id,
  purchase_id,
  ticket_number,
  qr_code,
  status
FROM tickets
WHERE purchase_id IN (
  SELECT id FROM purchases WHERE user_id = 'TU_USER_ID'
)
ORDER BY created_at DESC;
```

### Tabla `refunds` (si solicitaste devolución):
```sql
SELECT 
  id,
  purchase_id,
  reason,
  status,
  created_at
FROM refunds
WHERE user_id = 'TU_USER_ID'
ORDER BY created_at DESC;
```

**Resultado esperado:**
- Los datos deben estar correctamente guardados
- Las relaciones deben ser correctas
- Los QR codes deben ser únicos

---

## ✅ Checklist Final

Marca cada item cuando lo hayas verificado:

- [ ] Servidor corriendo sin errores
- [ ] Puedo iniciar sesión como usuario
- [ ] Puedo acceder a `/mis-compras`
- [ ] Veo mis compras listadas (o empty state si no tengo)
- [ ] Puedo expandir los detalles de una compra
- [ ] Los QR codes se muestran correctamente
- [ ] Puedo descargar el PDF sin errores
- [ ] El PDF contiene todos los tickets con QR codes
- [ ] Puedo solicitar una devolución
- [ ] La solicitud se guarda en la base de datos
- [ ] El diseño es responsive
- [ ] No hay errores en la consola del navegador
- [ ] Los datos en Supabase son correctos

---

## 🐛 Si encuentras errores

### Error: "Cannot read property 'map' of undefined"
**Solución:** Verifica que `purchases` no sea `undefined` en el componente

### Error: "Policy violation" o "RLS error"
**Solución:** Verifica las políticas RLS en Supabase para `purchases`, `tickets` y `refunds`

### Error: QR codes no se muestran
**Solución:** 
```bash
npm install qrcode.react
```

### Error: PDF no se genera
**Solución:**
```bash
npm install jspdf html2canvas
```

### Error: "Invalid hook call"
**Solución:** Verifica que los hooks estén en el orden correcto y no dentro de condicionales

---

## 📝 Notas adicionales

- Los QR codes se generan usando la librería `qrcode.react`
- El PDF se genera usando `jspdf` y `html2canvas`
- Los QR codes en el PDF se generan usando una API externa (`api.qrserver.com`)
- Las solicitudes de devolución se guardan con estado `pending` y deben ser procesadas manualmente por la productora o admin

---

**Última actualización:** 2025-01-27
