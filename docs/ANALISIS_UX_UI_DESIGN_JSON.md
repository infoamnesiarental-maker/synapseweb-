# 📋 Análisis de UX/UI vs Design.json

**Fecha:** 2025-01-27  
**Objetivo:** Identificar todas las discrepancias entre la implementación actual y el `design.json` para mejorar la consistencia visual y UX.

---

## 🎯 ÚLTIMAS IMPLEMENTACIONES REALIZADAS

### 1. **Mis Compras** (`app/mis-compras/page.tsx`)
- ✅ Lista de compras del usuario
- ✅ Visualización de tickets con QR codes
- ✅ Descarga de PDF con tickets
- ✅ Modal de solicitud de devolución
- ✅ Estados de compra (completado, pendiente, fallido, reembolsado)

### 2. **Panel de Analytics General** (`app/dashboard/analytics/page.tsx`)
- ✅ Filtros por fecha y eventos
- ✅ Métricas principales (Facturación, Tickets, Promedio, Vistas)
- ✅ Gráfico de evolución de ventas y visitas
- ✅ Mapa de calor de ventas por día/hora
- ✅ Selector de eventos con checkboxes

### 3. **Analytics por Evento** (`app/dashboard/eventos/[id]/analytics/page.tsx`)
- ✅ Métricas específicas del evento
- ✅ Gráfico de tickets vendidos por día
- ✅ Gráfico de vistas por día
- ✅ Desglose de tickets por tipo

### 4. **Envío de Emails** (`app/api/send-tickets-email/route.ts`)
- ✅ Envío automático de emails con tickets
- ✅ QR codes embebidos en el email
- ✅ Link a "Mis Compras" para descargar PDF

### 5. **CheckoutWizard** (`components/checkout/CheckoutWizard.tsx`)
- ✅ Wizard de 4 pasos
- ✅ Barra de progreso visual
- ✅ Validación de formularios
- ✅ Resumen de compra

---

## ❌ DISCREPANCIAS IDENTIFICADAS CON DESIGN.JSON

### 🔴 CRÍTICAS (Alta Prioridad)

#### 1. **Botones - Forma y Estilo**
**Ubicación:** Múltiples componentes  
**Problema:** Los botones no siguen el estilo "pill-shaped" (24-32px border-radius) definido en `design.json`

**Ejemplos:**
- `app/mis-compras/page.tsx` (línea 299): `rounded-lg` en lugar de `rounded-full` o `rounded-[32px]`
- `app/dashboard/analytics/page.tsx` (línea 309): Botones con `rounded-lg` en lugar de pill-shaped
- `app/dashboard/page.tsx` (línea 107): Botón "Nuevo Evento" usa gradiente pero no es pill-shaped consistente
- `components/events/EventDetail.tsx` (línea 406): Botón "Comprar Entradas" usa `rounded-full` ✅ (correcto)

**Según design.json:**
```json
"borderRadius": "24-32px (pill-shaped)",
"padding": "12-16px 32-48px"
```

**Antes:**
```tsx
className="px-6 py-3 bg-[#7C3AED] rounded-lg"
```

**Después (debería ser):**
```tsx
className="px-8 py-4 bg-[#7C3AED] rounded-[32px]"
```

---

#### 2. **Botones - Colores y Gradientes**
**Ubicación:** Múltiples componentes  
**Problema:** Uso inconsistente de colores. Algunos usan `#7C3AED` (correcto), otros usan colores genéricos de Tailwind

**Ejemplos:**
- `app/dashboard/analytics/page.tsx` (línea 309): `bg-blue-500/20` en lugar de usar colores del design system
- `app/dashboard/page.tsx` (línea 126): `bg-purple-500/20` en lugar de `bg-purple-vibrant/20`
- `app/dashboard/layout.tsx` (línea 142): `bg-purple-500/20` en lugar de `bg-purple-vibrant/20`

**Según design.json:**
```json
"vibrantPurple": "#A855F7",
"electricBlue": "#3B82F6",
"neonPink": "#EC4899"
```

**Antes:**
```tsx
className="bg-purple-500/20 text-purple-400"
```

**Después (debería ser):**
```tsx
className="bg-purple-vibrant/20 text-purple-vibrant"
```

---

#### 3. **Tipografía - Tamaños y Pesos**
**Ubicación:** Múltiples componentes  
**Problema:** No se respetan los tamaños y pesos definidos en `design.json`

**Ejemplos:**
- `app/mis-compras/page.tsx` (línea 271): `text-4xl md:text-5xl` - Debería ser `text-5xl md:text-6xl` según heroHeading
- `app/dashboard/analytics/page.tsx` (línea 126): `text-3xl md:text-4xl` - Debería usar sectionHeading (32-48px)
- `app/dashboard/page.tsx` (línea 98): `text-3xl md:text-4xl` - Debería usar sectionHeading

**Según design.json:**
```json
"heroHeading": { "size": "48-72px", "weight": "700-900" },
"sectionHeading": { "size": "32-48px", "weight": "700-800", "textTransform": "uppercase" },
"eventTitle": { "size": "18-24px", "weight": "700", "textTransform": "uppercase" }
```

**Antes:**
```tsx
<h1 className="text-3xl md:text-4xl font-bold">Título</h1>
```

**Después (debería ser):**
```tsx
<h1 className="text-4xl md:text-5xl font-black uppercase tracking-wider">TÍTULO</h1>
```

---

#### 4. **Cards - Border Radius y Sombras**
**Ubicación:** Múltiples componentes  
**Problema:** Border radius y sombras no coinciden con `design.json`

**Ejemplos:**
- `app/mis-compras/page.tsx` (línea 312): `rounded-2xl` - Debería ser `rounded-3xl` (24px según design.json)
- `app/dashboard/analytics/page.tsx` (línea 136): `rounded-2xl` - Debería ser `rounded-3xl`
- `app/dashboard/page.tsx` (línea 124): `rounded-2xl` - Debería ser `rounded-3xl`

**Según design.json:**
```json
"borderRadius": {
  "small": "8px",
  "medium": "16px",
  "large": "24px"
},
"shadows": {
  "card": "0 4px 24px rgba(0, 0, 0, 0.4)",
  "elevated": "0 8px 48px rgba(0, 0, 0, 0.6)"
}
```

**Antes:**
```tsx
className="bg-mediumGray rounded-2xl shadow-lg"
```

**Después (debería ser):**
```tsx
className="bg-mediumGray rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
```

---

### 🟡 MEDIAS (Prioridad Media)

#### 5. **Badges - Estilo y Colores**
**Ubicación:** `app/mis-compras/page.tsx`, `app/dashboard/analytics/page.tsx`  
**Problema:** Los badges no siguen el estilo pill-shaped con colores vibrantes definidos

**Ejemplos:**
- `app/mis-compras/page.tsx` (línea 213): Badge de estado usa `rounded-full` ✅ pero colores no son del design system
- `app/dashboard/analytics/page.tsx` (línea 196): Badges de eventos seleccionados usan `rounded` en lugar de `rounded-full`

**Según design.json:**
```json
"badges": {
  "style": "Pill-shaped with solid color backgrounds",
  "colors": "Vibrant accent colors (pink, purple, blue)",
  "padding": "6px 16px",
  "fontSize": "12-14px",
  "fontWeight": "600"
}
```

**Antes:**
```tsx
<span className="px-3 py-1 bg-green/20 text-green border border-green/50 rounded-full">
```

**Después (debería ser):**
```tsx
<span className="px-4 py-1.5 bg-green/30 text-green border-2 border-green/60 rounded-full text-xs font-semibold">
```

---

#### 6. **Inputs - Estilo y Focus States**
**Ubicación:** `components/checkout/CheckoutWizard.tsx`, `app/mis-compras/page.tsx`  
**Problema:** Los inputs no tienen el estilo consistente con el design system

**Ejemplos:**
- `components/checkout/CheckoutWizard.tsx` (línea 419): Inputs usan `rounded-xl` pero deberían tener mejor focus state
- `app/mis-compras/page.tsx` (línea 465): Textarea no sigue el estilo del design system

**Según design.json:**
```json
"transitions": {
  "default": "all 0.3s ease",
  "focus": "Visible focus indicators on interactive elements"
}
```

**Antes:**
```tsx
className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50"
```

**Después (debería ser):**
```tsx
className="px-4 py-3 bg-white/5 border-2 border-white/10 rounded-2xl focus:outline-none focus:border-purple-vibrant focus:ring-4 focus:ring-purple-vibrant/20 transition-all duration-300"
```

---

#### 7. **Spacing - Consistencia**
**Ubicación:** Múltiples componentes  
**Problema:** Spacing no sigue la escala definida en `design.json`

**Ejemplos:**
- `app/mis-compras/page.tsx`: Usa `space-y-6` pero debería usar la escala: xs (8px), sm (16px), md (24px), lg (48px), xl (72px)
- `app/dashboard/analytics/page.tsx`: Usa `gap-6` (24px) ✅ pero algunos usan `gap-4` (16px) que debería ser `gap-6`

**Según design.json:**
```json
"spacing": {
  "xs": "8px",
  "sm": "16px",
  "md": "24px",
  "lg": "48px",
  "xl": "72px",
  "xxl": "120px"
}
```

---

#### 8. **Gráficos - Estilo Visual**
**Ubicación:** `app/dashboard/analytics/page.tsx`, `app/dashboard/eventos/[id]/analytics/page.tsx`  
**Problema:** Los gráficos no tienen el estilo visual consistente con el design system

**Ejemplos:**
- Colores de los gráficos usan valores hardcodeados en lugar de usar las variables del design system
- Tooltips no tienen el estilo definido (deberían tener border purple-vibrant y sombra glow)

**Según design.json:**
```json
"shadows": {
  "glow": "0 0 24px rgba(168, 85, 247, 0.3) for accent elements"
}
```

**Antes:**
```tsx
contentStyle={{
  backgroundColor: '#1F1F1F',
  border: '2px solid #7C3AED',
}}
```

**Después (debería ser):**
```tsx
contentStyle={{
  backgroundColor: '#1F1F1F',
  border: '2px solid #A855F7', // purple-vibrant
  boxShadow: '0 0 24px rgba(168, 85, 247, 0.3)',
}}
```

---

### 🟢 BAJAS (Prioridad Baja - Mejoras Opcionales)

#### 9. **Hover States - Transiciones**
**Ubicación:** Múltiples componentes  
**Problema:** Algunos hover states no tienen las transiciones suaves definidas

**Según design.json:**
```json
"transitions": {
  "default": "all 0.3s ease",
  "fast": "all 0.15s ease",
  "smooth": "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
},
"hoverStates": {
  "cards": "Scale up slightly (1.02-1.05), increase shadow",
  "buttons": "Scale, glow effect, or color shift",
  "duration": "0.3s"
}
```

**Mejora sugerida:**
```tsx
className="transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-[0_8px_48px_rgba(0,0,0,0.6)]"
```

---

#### 10. **Empty States - Estilo Visual**
**Ubicación:** `app/mis-compras/page.tsx`, `app/dashboard/analytics/page.tsx`  
**Problema:** Los empty states no tienen un estilo visual consistente y atractivo

**Ejemplos:**
- `app/mis-compras/page.tsx` (línea 288): Empty state básico, podría mejorarse con mejor iconografía y mensaje

**Mejora sugerida:**
- Iconos más grandes y con opacidad
- Mensajes más claros y accionables
- Botones con mejor estilo

---

#### 11. **Modales - Estilo y Animaciones**
**Ubicación:** `app/mis-compras/page.tsx` (Refund Modal)  
**Problema:** El modal de devolución no tiene las animaciones y estilo definidos en el design system

**Según design.json:**
```json
"transitions": {
  "smooth": "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
}
```

**Mejora sugerida:**
- Usar Framer Motion para animaciones de entrada/salida
- Backdrop blur más pronunciado
- Border radius más generoso (24px)

---

#### 12. **Dashboard Layout - Sidebar**
**Ubicación:** `app/dashboard/layout.tsx`  
**Problema:** El sidebar no tiene el estilo completamente alineado con el design system

**Ejemplos:**
- Logo usa gradiente pero debería ser más consistente
- Items de navegación activos usan `bg-purple-500/20` en lugar de `bg-purple-vibrant/20`

---

## 📊 RESUMEN DE DISCREPANCIAS

| Categoría | Cantidad | Prioridad |
|-----------|---------|-----------|
| Botones (Forma/Color) | 8+ | 🔴 Crítica |
| Tipografía | 6+ | 🔴 Crítica |
| Cards (Border/Shadow) | 5+ | 🔴 Crítica |
| Badges | 3+ | 🟡 Media |
| Inputs | 2+ | 🟡 Media |
| Spacing | 4+ | 🟡 Media |
| Gráficos | 2+ | 🟡 Media |
| Hover States | Múltiples | 🟢 Baja |
| Empty States | 2+ | 🟢 Baja |
| Modales | 1+ | 🟢 Baja |
| Sidebar | 1+ | 🟢 Baja |

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Críticas (Prioridad Alta)
1. ✅ Estandarizar todos los botones a pill-shaped (24-32px border-radius)
2. ✅ Reemplazar colores genéricos por colores del design system
3. ✅ Ajustar tipografía a los tamaños y pesos definidos
4. ✅ Corregir border radius y sombras de cards

### Fase 2: Medias (Prioridad Media)
5. ✅ Mejorar estilo de badges
6. ✅ Estandarizar inputs y focus states
7. ✅ Aplicar escala de spacing consistente
8. ✅ Mejorar estilo visual de gráficos

### Fase 3: Bajas (Prioridad Baja)
9. ✅ Mejorar hover states y transiciones
10. ✅ Mejorar empty states
11. ✅ Mejorar modales con animaciones
12. ✅ Refinar sidebar

---

## 📝 NOTAS ADICIONALES

- **Colores del Design System:**
  - `purple-vibrant`: `#A855F7` (no `#7C3AED` que se usa actualmente)
  - `electricBlue`: `#3B82F6`
  - `neonPink`: `#EC4899`
  - `teal`: `#14B8A6`
  - `cyan`: `#06B6D4`

- **Variables de Tailwind a Crear/Verificar:**
  - `purple-vibrant` → `#A855F7`
  - `electric-blue` → `#3B82F6`
  - `neon-pink` → `#EC4899`
  - `teal` → `#14B8A6`
  - `cyan` → `#06B6D4`

- **Border Radius a Usar:**
  - Pequeño: `rounded-lg` (8px)
  - Mediano: `rounded-xl` (16px)
  - Grande: `rounded-3xl` (24px)
  - Pill: `rounded-full` (999px)

---

**Próximo Paso:** Revisar este documento y confirmar qué discrepancias quieres que prioricemos para corregir.
