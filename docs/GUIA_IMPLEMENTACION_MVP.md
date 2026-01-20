# 🚀 Guía de Implementación MVP - Synapse

**Versión:** MVP 1.0  
**Fecha:** 2025-01-27

---

## 📋 ÍNDICE

1. [Preparación del Entorno](#preparación-del-entorno)
2. [Configuración de Base de Datos](#configuración-de-base-de-datos)
3. [Estructura de Carpetas del Proyecto](#estructura-de-carpetas-del-proyecto)
4. [Orden de Implementación](#orden-de-implementación)
5. [Checklist de Funcionalidades](#checklist-de-funcionalidades)

---

## 🔧 PREPARACIÓN DEL ENTORNO

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima

# Mercado Pago (cuando lo implementes)
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=tu-clave-publica
MERCADOPAGO_ACCESS_TOKEN=tu-access-token

# Email (cuando lo implementes)
RESEND_API_KEY=tu-api-key
```

---

## 🗄️ CONFIGURACIÓN DE BASE DE DATOS

### Paso 1: Ejecutar Script SQL

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Abre el **SQL Editor**
3. Copia y pega el contenido completo de `supabase_mvp_schema.sql`
4. Ejecuta el script (botón "Run" o `Ctrl+Enter`)

### Paso 2: Verificar Creación

Verifica que se crearon todas las tablas:

```sql
-- Ejecutar en SQL Editor para verificar
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Deberías ver:
- `event_metrics` (vista)
- `event_views`
- `events`
- `profiles`
- `producers`
- `purchases`
- `refunds`
- `ticket_types`
- `tickets`

### Paso 3: Crear Usuario Admin Inicial

```sql
-- Crear usuario admin manualmente (o hacerlo desde Auth en Supabase)
-- Luego actualizar su rol:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@synapse.com';
```

---

## 📁 ESTRUCTURA DE CARPETAS DEL PROYECTO

```
synapseweb/
├── app/
│   ├── layout.tsx ✅
│   ├── page.tsx ✅ (Landing)
│   ├── globals.css ✅
│   │
│   ├── (auth)/                    # Grupo de autenticación
│   │   ├── login/
│   │   │   └── page.tsx           # Página de login
│   │   ├── register/
│   │   │   └── page.tsx           # Página de registro
│   │   └── register-producer/
│   │       └── page.tsx           # Registro de productora
│   │
│   ├── eventos/                    # Público
│   │   ├── page.tsx               # Listado de eventos
│   │   └── [slug]/
│   │       └── page.tsx           # Detalle de evento
│   │
│   ├── checkout/                  # Proceso de compra
│   │   ├── page.tsx               # Selección de tickets
│   │   └── [purchaseId]/
│   │       └── page.tsx           # Confirmación
│   │
│   ├── mis-compras/               # Usuario registrado
│   │   ├── page.tsx               # Lista de compras
│   │   └── [purchaseId]/
│   │       └── page.tsx           # Detalle de compra
│   │
│   ├── dashboard/                 # Productoras
│   │   ├── layout.tsx             # Layout con sidebar
│   │   ├── page.tsx               # Dashboard resumen
│   │   ├── eventos/
│   │   │   ├── page.tsx           # Lista de eventos
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx       # Crear evento
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Editar evento
│   │   │       └── analytics/
│   │   │           └── page.tsx   # Analytics del evento
│   │   ├── asistentes/
│   │   │   └── page.tsx           # Lista de asistentes
│   │   ├── devoluciones/
│   │   │   └── page.tsx           # Gestión de devoluciones
│   │   └── perfil/
│   │       └── page.tsx           # Perfil productora
│   │
│   └── admin/                     # Super Admin
│       ├── layout.tsx
│       ├── page.tsx               # Dashboard admin
│       ├── productoras/
│       │   └── page.tsx           # Gestión de productoras
│       └── usuarios/
│           └── page.tsx           # Gestión de usuarios
│
├── components/
│   ├── sections/                  # Secciones de landing
│   │   ├── HeroWithVideo.tsx ✅
│   │   ├── EventsSection.tsx ✅
│   │   ├── FeaturesSection.tsx ✅
│   │   └── Footer.tsx ✅
│   │
│   ├── cards/                     # Tarjetas
│   │   ├── EventCard.tsx ✅
│   │   ├── ClientFeatureCard.tsx ✅
│   │   └── ProducerFeatureCard.tsx ✅
│   │
│   ├── ui/                        # Componentes reutilizables
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   │
│   ├── auth/                      # Componentes de auth
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── RegisterProducerForm.tsx
│   │
│   ├── events/                    # Componentes de eventos
│   │   ├── EventList.tsx
│   │   ├── EventDetail.tsx
│   │   └── TicketSelector.tsx
│   │
│   ├── checkout/                  # Componentes de checkout
│   │   ├── Cart.tsx
│   │   ├── CheckoutForm.tsx
│   │   └── PaymentForm.tsx
│   │
│   └── dashboard/                 # Componentes de dashboard
│       ├── DashboardStats.tsx
│       ├── EventAnalytics.tsx
│       └── AttendeesList.tsx
│
├── lib/
│   ├── supabase/                  # Clientes Supabase
│   │   ├── client.ts ✅
│   │   ├── server.ts ✅
│   │   └── middleware.ts ✅
│   │
│   ├── utils/                     # Utilidades
│   │   ├── format.ts ✅
│   │   ├── qr.ts                  # Generación de QR
│   │   └── pdf.ts                 # Generación de PDF
│   │
│   ├── types/                     # Tipos TypeScript
│   │   ├── database.ts            # Tipos de Supabase
│   │   ├── event.ts
│   │   └── purchase.ts
│   │
│   └── hooks/                     # Hooks personalizados
│       ├── useAuth.ts
│       ├── useEvents.ts
│       └── usePurchases.ts
│
├── public/                        # Archivos estáticos
│   └── ...
│
└── supabase_mvp_schema.sql        # Script SQL ✅
```

---

## 🎯 ORDEN DE IMPLEMENTACIÓN

### **FASE 1: Autenticación (Semana 1-2)** 🔴

#### Día 1-2: Páginas de Auth ✅ COMPLETADO
- [x] Crear `app/(auth)/login/page.tsx`
- [x] Crear `app/(auth)/register/page.tsx`
- [x] Crear `app/(auth)/register-producer/page.tsx`
- [x] Crear componentes `components/auth/LoginForm.tsx`
- [x] Crear componentes `components/auth/RegisterForm.tsx`
- [x] Crear componentes `components/auth/ProducerRegistrationFlow.tsx` (3 etapas)
- [x] Integrar con Supabase Auth

#### Día 3-4: Protección de Rutas ✅ COMPLETADO
- [x] Actualizar `lib/supabase/middleware.ts` con lógica de protección
- [x] Crear hook `lib/hooks/useAuth.ts`
- [x] Proteger rutas `/dashboard/*` (solo productoras activas)
- [x] Proteger rutas `/admin/*` (solo admin)
- [x] Proteger rutas `/mis-compras` (solo usuarios autenticados)
- [x] Crear páginas placeholder: `/dashboard`, `/admin`, `/mis-compras`
- [x] Mejorar `useAuth` para verificar productora activa

#### Día 5-7: Perfiles y Productoras
- [ ] Crear página de perfil de usuario
- [ ] Crear página de perfil de productora
- [ ] Implementar actualización de perfil
- [ ] Implementar creación de productora (desde registro)

---

### **FASE 2: Eventos Públicos (Semana 3)** ✅ COMPLETADO

#### Día 8-10: Listado de Eventos ✅ COMPLETADO
- [x] Crear `app/eventos/page.tsx`
- [x] Crear componente `components/events/EventList.tsx`
- [x] Implementar filtros (fecha, categoría)
- [x] Implementar búsqueda
- [x] Conectar con Supabase
- [x] Crear `app/page.tsx` (Landing pública)
- [x] Crear `app/home/page.tsx` (Home para usuarios autenticados)
- [x] Crear `components/EventsSection.tsx`
- [x] Crear `components/EventCard.tsx`
- [x] Crear `lib/hooks/usePublicEvents.ts`
- [x] Crear `lib/hooks/useEventBySlug.ts`

#### Día 11-12: Detalle de Evento ✅ COMPLETADO
- [x] Crear `app/eventos/[slug]/page.tsx`
- [x] Crear componente `components/events/EventDetail.tsx`
- [x] Mostrar tipos de tickets disponibles
- [x] Implementar contador de vistas (event_views)
- [x] Botón "Comprar Tickets"
- [x] Mostrar categoría del evento
- [x] Mostrar precio mínimo
- [x] Mostrar cantidad de tickets disponibles
- [x] Crear `lib/hooks/useEventView.ts`

---

### **FASE 3: Proceso de Compra (Semana 4-5)** 🟡 PARCIALMENTE COMPLETADO

#### Día 13-15: Carrito y Checkout ✅ COMPLETADO
- [x] Crear `components/checkout/CheckoutWizard.tsx` (Wizard de 4 pasos)
- [x] Implementar selección de tickets
- [x] Calcular totales (precio + comisiones)
- [x] Paso 1: Revisar orden
- [x] Paso 2: Datos del comprador
- [x] Paso 3: Datos de tickets
- [x] Paso 4: Confirmación
- [x] Validación de formularios
- [x] Diseño moderno siguiendo design.json
- [x] Crear `lib/utils/pricing.ts` (cálculo de precios)

#### Día 16-18: Formulario de Compra ✅ COMPLETADO (MVP)
- [x] Wizard completo con todos los campos necesarios
- [x] Opción: comprar como invitado o registrado (automático según auth)
- [x] Validación de formulario en cada paso
- [x] Crear `purchase` en Supabase
- [x] Crear `lib/hooks/useCheckout.ts`
- [x] Crear `app/checkout/success/page.tsx`
- [ ] ⚠️ Integración con Mercado Pago (pendiente - actualmente simulado)

#### Día 19-21: Generación de Tickets 🟡 PARCIALMENTE COMPLETADO
- [x] Al confirmar compra, crear `tickets` en Supabase
- [x] Generar QR codes únicos (usando funciones de Supabase)
- [x] Generar `ticket_number` único
- [x] Generar `qr_hash` para validación
- [ ] ⚠️ Crear función `lib/utils/pdf.ts` para generar PDF (pendiente)
- [ ] ⚠️ Enviar email con tickets (pendiente)

---

### **FASE 4: Dashboard Productoras (Semana 6-7)** 🟡 PARCIALMENTE COMPLETADO

#### Día 22-24: Dashboard Resumen ✅ COMPLETADO
- [x] Crear `app/dashboard/layout.tsx` con sidebar
- [x] Crear `app/dashboard/page.tsx`
- [x] Implementar métricas globales desde base de datos
- [x] Total de facturación
- [x] Total de tickets vendidos
- [x] Ticket promedio
- [x] Eventos activos
- [x] Transferencias pendientes/completadas
- [x] Crear `lib/hooks/useTransfers.ts`
- [ ] ⚠️ Gráficos simples (pendiente - usar recharts o similar)

#### Día 25-27: Gestión de Eventos ✅ COMPLETADO
- [x] Crear `app/dashboard/eventos/page.tsx` (lista)
- [x] Crear `app/dashboard/eventos/nuevo/page.tsx` (crear)
- [x] Crear `app/dashboard/eventos/[id]/page.tsx` (editar)
- [x] Crear `components/dashboard/CreateEventWizard.tsx` (4 pasos)
- [x] Formulario de creación/edición de eventos
- [x] Subida de flyer (usar Supabase Storage)
- [x] Gestión de tipos de tickets
- [x] Eliminación de eventos (con limpieza de storage)
- [x] Crear `components/dashboard/CategorySelector.tsx`
- [x] Crear `components/dashboard/DateTimePicker.tsx`
- [x] Crear `components/dashboard/ImageUpload.tsx`
- [x] Crear `lib/hooks/useEvents.ts`

#### Día 28-30: Analytics y Asistentes 🟡 PARCIALMENTE COMPLETADO
- [x] Crear `app/dashboard/analytics/page.tsx` (placeholder)
- [x] Crear `app/dashboard/asistentes/page.tsx` (placeholder)
- [x] Crear `app/dashboard/devoluciones/page.tsx` (placeholder)
- [ ] ⚠️ Crear `app/dashboard/eventos/[id]/analytics/page.tsx` (pendiente)
- [ ] ⚠️ Crear componente `components/dashboard/EventAnalytics.tsx` (pendiente)
- [ ] ⚠️ Mostrar métricas del evento (pendiente)
- [ ] ⚠️ Lista de asistentes exportable a CSV (pendiente)

---

### **FASE 5: Devoluciones y Validación (Semana 8)** 🔵

#### Día 31-33: Sistema de Devoluciones
- [ ] Crear `app/dashboard/devoluciones/page.tsx`
- [ ] Crear `app/mis-compras/[purchaseId]/page.tsx` con botón de devolución
- [ ] Formulario de solicitud de devolución
- [ ] Aprobar/rechazar devoluciones (productoras)
- [ ] Procesar reembolsos

#### Día 34-35: Validación QR
- [ ] Crear página de validación (para productoras)
- [ ] Escáner QR (usar librería como `html5-qrcode`)
- [ ] Validar tickets (actualizar status a 'used')
- [ ] Dashboard de validación en tiempo real

---

### **FASE 6: Panel Admin (Semana 9)** 🔵

#### Día 36-38: Gestión de Productoras
- [ ] Crear `app/admin/layout.tsx`
- [ ] Crear `app/admin/page.tsx` (dashboard)
- [ ] Crear `app/admin/productoras/page.tsx`
- [ ] Lista de productoras
- [ ] Activar/desactivar productoras

#### Día 39-40: Gestión de Usuarios
- [ ] Crear `app/admin/usuarios/page.tsx`
- [ ] Lista de usuarios
- [ ] Cambiar roles
- [ ] Suspender usuarios

---

## ✅ CHECKLIST DE FUNCIONALIDADES

### Autenticación ✅ COMPLETADO
- [x] Login con email/contraseña
- [x] Registro de usuarios
- [x] Registro de productoras (3 etapas)
- [ ] Recuperación de contraseña (pendiente)
- [x] Protección de rutas
- [x] Diferentes dashboards por rol

### Eventos Públicos ✅ COMPLETADO
- [x] Listado de eventos publicados
- [x] Filtros (fecha, categoría)
- [x] Búsqueda
- [x] Página de detalle de evento
- [x] Contador de vistas
- [x] Landing page pública
- [x] Home para usuarios autenticados

### Proceso de Compra 🟡 PARCIALMENTE COMPLETADO
- [x] Selección de tickets
- [x] Checkout wizard (4 pasos)
- [x] Checkout (invitado o registrado)
- [x] Generación de tickets en BD
- [x] Generación de QR (usando funciones de Supabase)
- [ ] ⚠️ Integración Mercado Pago (pendiente - simulado)
- [ ] ⚠️ Generación de PDF (pendiente)
- [ ] ⚠️ Envío de email (pendiente)

### Dashboard Productoras 🟡 PARCIALMENTE COMPLETADO
- [x] Dashboard resumen con métricas
- [x] Crear eventos
- [x] Editar eventos
- [x] Lista de eventos
- [x] Eliminar eventos
- [x] Perfil de productora (básico)
- [ ] ⚠️ Analytics por evento (pendiente)
- [ ] ⚠️ Lista de asistentes (pendiente)
- [ ] ⚠️ Exportar CSV (pendiente)
- [ ] ⚠️ Gestión de devoluciones (pendiente)

### Validación
- [ ] Escáner QR
- [ ] Validación de tickets
- [ ] Dashboard de validación
- [ ] Prevención de duplicados

### Panel Admin
- [ ] Dashboard admin
- [ ] Gestión de productoras
- [ ] Gestión de usuarios
- [ ] Métricas globales

---

## 🔑 FUNCIONES CLAVE A IMPLEMENTAR

### 1. Generación de QR Code

```typescript
// lib/utils/qr.ts
import { generateQrCode, generateQrHash } from '@/lib/supabase/server'

export async function createTicketQR(ticketId: string, eventId: string) {
  // Llamar a función de Supabase o generar localmente
  const qrCode = await generateQrCode(ticketId)
  const qrHash = await generateQrHash(ticketId, qrCode)
  return { qrCode, qrHash }
}
```

### 2. Generación de PDF

```typescript
// lib/utils/pdf.ts
// Usar librería como @react-pdf/renderer o jsPDF
export async function generateTicketPDF(ticket: Ticket) {
  // Generar PDF con información del ticket y QR
}
```

### 3. Integración Mercado Pago

```typescript
// lib/mercadopago.ts
// Usar SDK de Mercado Pago
export async function createPayment(preference: PaymentPreference) {
  // Crear preferencia de pago
  // Retornar init_point para redirigir
}
```

### 4. Envío de Emails

```typescript
// lib/email.ts
// Usar Resend o similar
export async function sendTicketEmail(email: string, tickets: Ticket[]) {
  // Enviar email con tickets adjuntos
}
```

---

## 📚 RECURSOS ÚTILES

### Librerías Recomendadas

- **QR Codes:** `qrcode` o `react-qr-code`
- **PDF:** `@react-pdf/renderer` o `jspdf`
- **Gráficos:** `recharts` o `chart.js`
- **Validación:** `zod` + `react-hook-form`
- **Mercado Pago:** `mercadopago` (SDK oficial)
- **Email:** `resend` o `@sendgrid/mail`
- **Escáner QR:** `html5-qrcode`

### Documentación

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs)
- [Next.js 15](https://nextjs.org/docs)

---

## 🚨 NOTAS IMPORTANTES

1. **Seguridad:**
   - Las políticas RLS son la primera línea de defensa
   - Validar siempre en la aplicación también
   - Nunca confiar solo en el cliente

2. **Performance:**
   - Usar índices correctamente (ya están creados)
   - Implementar paginación en listados
   - Cachear datos cuando sea posible

3. **Testing:**
   - Probar todas las políticas RLS con diferentes usuarios
   - Probar flujo completo de compra
   - Probar validación de tickets

---

---

## 📊 RESUMEN DEL ESTADO ACTUAL

### ✅ Completado (100%):
- **FASE 1: Autenticación** - Login, registro, registro productora, protección de rutas
- **FASE 2: Eventos Públicos** - Landing, listado, detalle, filtros, búsqueda

### 🟡 Parcialmente Completado:
- **FASE 3: Proceso de Compra** - Checkout wizard completo, creación de tickets en BD, falta Mercado Pago real, PDF y Email
- **FASE 4: Dashboard Productoras** - Dashboard resumen, gestión de eventos completa, falta Analytics y Asistentes

### 🔴 Pendiente:
- **FASE 5: Devoluciones y Validación** - No iniciado
- **FASE 6: Panel Admin** - Solo estructura básica

### 📈 Progreso Total: **~65% del MVP**

---

**Próximo paso recomendado:** Integración real de Mercado Pago y generación de PDF/Email de tickets

**Ver documento completo:** `docs/ESTADO_PROYECTO_ACTUAL.md` para análisis detallado
