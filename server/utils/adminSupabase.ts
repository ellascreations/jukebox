import { createClient } from '@supabase/supabase-js'

export function useAdminSupabase() {
  const config = useRuntimeConfig()
  const url = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const key = config.supabaseServiceRoleKey
  if (!url || !key) throw createError({ statusCode: 500, statusMessage: 'Supabase server configuration missing' })
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
