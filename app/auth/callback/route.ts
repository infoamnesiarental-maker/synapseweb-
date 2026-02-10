import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Ruta de callback para confirmación de email
 * 
 * Supabase redirige aquí después de que el usuario hace clic en el link de confirmación
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/login?confirmed=true'

  // Si hay un token_hash, significa que es una confirmación de email
  if (token_hash && type) {
    const supabase = await createClient()

    // Intercambiar el token por la sesión
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (error) {
      console.error('Error verificando token:', error)
      // Redirigir a login con mensaje de error
      const errorUrl = new URL('/login', requestUrl.origin)
      errorUrl.searchParams.set('error', 'invalid_token')
      errorUrl.searchParams.set('message', 'El link de confirmación es inválido o expiró')
      return NextResponse.redirect(errorUrl.toString())
    }

    if (data.user) {
      // Email confirmado exitosamente
      // Redirigir a login con mensaje de éxito
      const successUrl = new URL('/login', requestUrl.origin)
      successUrl.searchParams.set('confirmed', 'true')
      successUrl.searchParams.set('message', 'Email confirmado exitosamente. Ya podés iniciar sesión.')
      return NextResponse.redirect(successUrl.toString())
    }
  }

  // Si no hay token_hash, puede ser un redirect normal de Supabase
  // Redirigir a la página especificada o a login
  return NextResponse.redirect(new URL(next, requestUrl.origin).toString())
}
