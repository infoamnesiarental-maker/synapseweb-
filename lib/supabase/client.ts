import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Durante el build, retornar un cliente mock si no hay variables de entorno
  // Esto evita errores durante el build en CI/CD
  if (!supabaseUrl || !supabaseAnonKey) {
    // En tiempo de build, crear un cliente con valores dummy
    // Esto solo se usa durante el build, nunca en runtime
    if (typeof window === 'undefined') {
      // Server-side durante build: usar valores dummy
      return createBrowserClient(
        'https://placeholder.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder'
      )
    }
    // Client-side: lanzar error porque es necesario
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file'
    )
  }

  // Validar que la URL sea válida
  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error(
      'Invalid NEXT_PUBLIC_SUPABASE_URL. Must be a valid HTTP or HTTPS URL (e.g., https://your-project.supabase.co)'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

