import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
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

