# 🔧 Cómo Activar tu Productora (Sin tocar código)

## Problema
El middleware está bloqueando el acceso al dashboard porque tu productora tiene `is_active = false`.

## Solución: Activar desde Supabase

### Paso 1: Abre Supabase Dashboard
1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor** (en el menú lateral)

### Paso 2: Ver tus productoras
Ejecuta este query para ver todas las productoras y sus estados:

```sql
SELECT 
  p.id,
  p.name as nombre_productora,
  pr.email as email_usuario,
  pr.full_name as nombre_completo,
  p.is_active as esta_activa,
  p.registration_stage as etapa_registro,
  p.created_at as fecha_creacion
FROM producers p
JOIN profiles pr ON p.user_id = pr.id
ORDER BY p.created_at DESC;
```

### Paso 3: Activar tu productora

**Opción A: Por email (más fácil)**
```sql
UPDATE producers
SET is_active = true
WHERE user_id IN (
  SELECT id FROM profiles WHERE email = 'TU_EMAIL_AQUI'
);
```

**Opción B: Por user_id**
1. Ve a **Authentication > Users** en Supabase
2. Encuentra tu usuario y copia el **UUID** (user_id)
3. Ejecuta:

```sql
UPDATE producers
SET is_active = true
WHERE user_id = 'TU_USER_ID_AQUI';
```

**Opción C: Activar todas (solo desarrollo)**
```sql
UPDATE producers
SET is_active = true
WHERE is_active = false;
```

### Paso 4: Verificar
Ejecuta esto para confirmar que se activó:

```sql
SELECT 
  p.name as nombre_productora,
  pr.email as email_usuario,
  p.is_active as esta_activa,
  CASE 
    WHEN p.is_active THEN '✅ ACTIVA'
    ELSE '❌ INACTIVA'
  END as estado
FROM producers p
JOIN profiles pr ON p.user_id = pr.id
WHERE pr.email = 'TU_EMAIL_AQUI';
```

### Paso 5: Probar
1. Refresca la página del dashboard
2. Deberías poder acceder sin problemas

## ¿Por qué está inactiva?

Por defecto, cuando creas una productora, se crea con `is_active = false` para que un admin la apruebe manualmente. Esto es por seguridad.

Si eres el admin o estás en desarrollo, puedes activarla directamente desde SQL.

## Script completo listo para usar

El archivo `supabase/migrations/supabase_activar_productora.sql` tiene todas las opciones listas para copiar y pegar.
