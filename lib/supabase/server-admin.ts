import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente admin de Supabase para uso exclusivo en backend (webhooks, jobs, etc.).
 * Usa la service role key para bypassear RLS de forma controlada.
 *
 * IMPORTANTE:
 * - Nunca importar este cliente desde código que pueda ejecutarse en el cliente.
 * - Nunca exponer SUPABASE_SERVICE_ROLE_KEY como NEXT_PUBLIC_.
 */
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

