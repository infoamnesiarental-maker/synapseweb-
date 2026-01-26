import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Skipping middleware.')
    return supabaseResponse
  }

  // Validar que la URL sea válida
  try {
    new URL(supabaseUrl)
  } catch {
    console.warn('Invalid NEXT_PUBLIC_SUPABASE_URL. Must be a valid HTTP or HTTPS URL. Skipping middleware.')
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Verificar autenticación del usuario
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Excluir rutas de API del procesamiento del middleware
  // Las rutas de API manejan su propia autenticación si es necesaria
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // Excluir archivos estáticos del procesamiento del middleware
  // Estos archivos deben ser servidos directamente por Next.js
  const staticFileExtensions = ['.mp4', '.mov', '.avi', '.webm', '.pdf', '.zip', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico']
  const isStaticFile = staticFileExtensions.some(ext => pathname.toLowerCase().endsWith(ext))
  
  // Si es un archivo estático, retornar sin procesar
  if (isStaticFile) {
    return supabaseResponse
  }

  // Rutas públicas (no requieren autenticación)
  const publicRoutes = ['/', '/login', '/register', '/register-producer']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith('/eventos'))

  // Si no está autenticado y trata de acceder a ruta protegida
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Si está autenticado, obtener su perfil y rol
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || 'user'

    // Proteger rutas de dashboard (solo productoras)
    if (pathname.startsWith('/dashboard')) {
      if (userRole !== 'producer') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      // Verificar que la productora esté activa
      const { data: producer, error: producerError } = await supabase
        .from('producers')
        .select('is_active')
        .eq('user_id', user.id)
        .maybeSingle()

      if (producerError) {
        console.error('❌ [MIDDLEWARE] Error obteniendo productora:', producerError)
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      if (!producer) {
        console.log('❌ [MIDDLEWARE] Usuario con rol producer pero sin registro en producers, redirigiendo')
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      console.log('🔍 [MIDDLEWARE] Productora encontrada:', {
        user_id: user.id,
        is_active: producer.is_active,
      })

      if (!producer.is_active) {
        console.log('❌ [MIDDLEWARE] Productora inactiva, redirigiendo a /')
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      console.log('✅ [MIDDLEWARE] Productora activa, permitiendo acceso a dashboard')
    }

    // Proteger rutas de admin (solo admin)
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }

    // Proteger /mis-compras (solo usuarios autenticados)
    if (pathname.startsWith('/mis-compras')) {
      // Ya está autenticado, permitir acceso
      // No requiere rol específico
    }

    // Redirigir usuarios autenticados que intentan acceder a login/register
    if (pathname === '/login' || pathname === '/register') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}

