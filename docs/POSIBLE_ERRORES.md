Diagnóstico definitivo
Problema 1 — RLS (el más fácil de confirmar)
La política WITH CHECK (true) debería funcionar, pero en Supabase, cuando RLS está habilitado y el cliente usa anon key sin usuario autenticado, las políticas de INSERT con WITH CHECK (true) igual fallan si no hay un auth.uid() válido en contexto. La solución es usar service_role_key que bypasea RLS completamente.
Problema 2 — Bug silencioso en la validación de UUID
Mirá estas líneas del código:
typescriptconst isUUID = /.../.test(paymentId)
const isNumeric = /^\d+$/.test(paymentId)

if (isUUID) {
  // ... intenta resolver el UUID ...
  // si lo resuelve, paymentId cambia a número
  // si NO lo resuelve, hace return 200
}

if (!isNumeric) {  // ← ESTE CHECK USA LA VAR ORIGINAL, NO LA ACTUALIZADA
  return NextResponse.json({ error: '...' }, { status: 200 })
}
El isNumeric se calcula antes de que el bloque isUUID cambie paymentId. Entonces si el UUID se resolvió correctamente a un número, isNumeric sigue siendo false → el webhook retorna 200 sin procesar nada. Este es probablemente el bug que rompió lo que antes funcionaba.
Problema 3 — Lógica de email invertida
typescript// Verifica si YA existen tickets para NO enviar email
if (!existingTicketsForEmail || existingTicketsForEmail.length === 0) {
  // Envía email solo si NO hay tickets
Pero los tickets se crean unas líneas antes en el mismo request. Entonces cuando llega a este check, los tickets ya existen → el email nunca se envía.

Los fixes
Fix 1 — lib/supabase/server-admin.ts (archivo nuevo, no tocar el existente)
typescriptimport { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
Fix 2 — webhook/route.ts (los cambios puntuales)
typescript// 1. Cambiar el import al principio del archivo
import { createAdminClient } from '@/lib/supabase/server-admin'

// 2. Reemplazar TODAS las instancias de:
const supabase = await createClient()
// Por:
const supabase = createAdminClient()
// (sin await, createAdminClient es síncrono)

// 3. Fix del bug isNumeric — mover la validación DESPUÉS del bloque isUUID
// ANTES (líneas ~160-168):
const isUUID = /^[0-9a-f]{8}-...$/i.test(paymentId)
const isNumeric = /^\d+$/.test(paymentId)  // ← SACAR DE ACÁ

if (isUUID) {
  // ... todo el bloque que puede cambiar paymentId ...
}

if (!isNumeric) { ... }  // ← SACAR ESTE BLOQUE

// DESPUÉS — al final del bloque isUUID, agregar:
if (isUUID) {
  // ... todo el bloque existente sin cambios ...
}

// Validar numérico AQUÍ, después de que isUUID pudo haber cambiado paymentId
if (!/^\d+$/.test(paymentId)) {
  console.error('❌ Payment ID no es numérico después de validaciones:', paymentId)
  return NextResponse.json({ error: 'Payment ID inválido' }, { status: 200 })
}

// 4. Fix de la lógica del email — rastrear si los tickets se crearon en ESTE request
// Antes del bloque de creación de tickets, agregar una variable:
let ticketsCreatedThisRequest = false

// Dentro del bloque donde se insertan tickets exitosamente:
if (ticketsToInsert.length > 0) {
  const { error: ticketsInsertError } = await supabase
    .from('tickets')
    .insert(ticketsToInsert)
  if (!ticketsInsertError) {
    ticketsCreatedThisRequest = true  // ← AGREGAR ESTO
    console.log(`✅ ${ticketsToInsert.length} tickets creados`)
  }
}

// Luego reemplazar la condición del email:
// ANTES:
if (!existingTicketsForEmail || existingTicketsForEmail.length === 0) {
// DESPUÉS:
if (ticketsCreatedThisRequest) {
Fix 3 — Verificar en Vercel que exista la env var
En el dashboard de Vercel → Settings → Environment Variables, confirmar que SUPABASE_SERVICE_ROLE_KEY esté configurada. La encontrás en Supabase → Project Settings → API → service_role key. Nunca la expongas con el prefijo NEXT_PUBLIC_.

Orden de implementación

Crear lib/supabase/server-admin.ts
Agregar SUPABASE_SERVICE_ROLE_KEY en Vercel
Aplicar los 4 fixes en route.ts
Deploy y revisar los logs — con el service role key, el webhook log va a insertarse y vas a poder confirmar idempotencia funcionando

El fix más urgente es el de isNumeric porque es el que está causando el 500. El de email es el que explica por qué los QR nunca llegaban.