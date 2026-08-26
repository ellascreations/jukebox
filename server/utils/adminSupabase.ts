import { createClient } from '@supabase/supabase-js'

export function useAdminSupabase() {
  const config = useRuntimeConfig()
  const url = config.supabaseUrl
  const key = config.supabaseServiceRoleKey
  if (!url || !key) throw createError({ statusCode: 500, statusMessage: 'Supabase server configuration missing' })
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
