# 📦 Configuración de Supabase Storage para Flyers

Este documento explica cómo configurar Supabase Storage para permitir la subida de imágenes de flyers de eventos.

## 🎯 Paso 1: Crear el Bucket en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Storage** en el menú lateral
3. Haz clic en **"New bucket"** o **"Crear bucket"**
4. Configura el bucket:
   - **Name**: `event-flyers` (debe ser exactamente este nombre)
   - **Public bucket**: ✅ **Marcar como público** (para que las imágenes sean accesibles públicamente)
   - **File size limit**: `5242880` (5MB en bytes) o el tamaño que prefieras
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp`

5. Haz clic en **"Create bucket"**

## 🔒 Paso 2: Configurar Políticas RLS (Row Level Security)

Después de crear el bucket, necesitas configurar las políticas de seguridad para que las productoras puedan subir imágenes.

### Opción A: Desde el Dashboard (Recomendado)

1. Ve a **Storage** → **Policies** en el menú lateral
2. Selecciona el bucket `event-flyers`
3. Haz clic en **"New Policy"** o **"Nueva Política"**

#### Política 1: Permitir lectura pública (SELECT)

```sql
-- Nombre: "Public can view flyers"
-- Operación: SELECT
-- Target roles: anon, authenticated

true
```

#### Política 2: Permitir subida a productoras autenticadas (INSERT)

```sql
-- Nombre: "Producers can upload flyers"
-- Operación: INSERT
-- Target roles: authenticated

EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'producer'
)
```

#### Política 3: Permitir actualización a productoras (UPDATE)

```sql
-- Nombre: "Producers can update own flyers"
-- Operación: UPDATE
-- Target roles: authenticated

EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'producer'
)
```

#### Política 4: Permitir eliminación a productoras (DELETE)

```sql
-- Nombre: "Producers can delete own flyers"
-- Operación: DELETE
-- Target roles: authenticated

EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'producer'
)
```

### Opción B: Desde SQL Editor

Si prefieres usar SQL directamente, ejecuta este script en el **SQL Editor**:

```sql
-- Crear políticas para el bucket event-flyers
-- Asegúrate de que el bucket existe primero

-- Política 1: Lectura pública
CREATE POLICY "Public can view flyers"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-flyers');

-- Política 2: Subida para productoras
CREATE POLICY "Producers can upload flyers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-flyers' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'producer'
  )
);

-- Política 3: Actualización para productoras
CREATE POLICY "Producers can update own flyers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-flyers' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'producer'
  )
);

-- Política 4: Eliminación para productoras
CREATE POLICY "Producers can delete own flyers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-flyers' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'producer'
  )
);
```

## ✅ Paso 3: Verificar la Configuración

1. Ve a **Storage** → **event-flyers**
2. Intenta subir una imagen de prueba desde el dashboard
3. Verifica que la imagen sea accesible públicamente

## 🧪 Paso 4: Probar en la Aplicación

1. Inicia sesión como productora en tu aplicación
2. Ve a **Dashboard** → **Eventos** → **Nuevo Evento**
3. En la sección "Flyer / Imagen", deberías poder:
   - Arrastrar y soltar una imagen
   - O hacer clic para seleccionar una imagen
4. La imagen debería subirse y mostrarse un preview
5. Al guardar el evento, la URL de la imagen debería guardarse en la base de datos

## 🐛 Solución de Problemas

### Error: "Bucket not found"
- Verifica que el bucket se llame exactamente `event-flyers`
- Verifica que el bucket esté creado en Supabase

### Error: "new row violates row-level security policy"
- Verifica que las políticas RLS estén configuradas correctamente
- Asegúrate de estar autenticado como productora

### Error: "File size exceeds limit"
- Verifica el límite de tamaño del bucket
- El componente está configurado para máximo 5MB por defecto

### La imagen no se muestra
- Verifica que el bucket sea público
- Verifica que la URL pública sea correcta
- Revisa la consola del navegador para errores

## 📝 Notas Importantes

- El bucket debe ser **público** para que las imágenes sean accesibles sin autenticación
- Las políticas RLS controlan quién puede subir/actualizar/eliminar
- Los archivos se organizan en la carpeta `event-flyers/` dentro del bucket
- Cada imagen tiene un nombre único basado en timestamp y random string
