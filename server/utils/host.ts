import { useAdminSupabase } from './adminSupabase'

export async function requireHostUser(event: any) {
  const authorization = getHeader(event, 'authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Host sign-in required' })

  const db = useAdminSupabase()
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) throw createError({ statusCode: 401, statusMessage: 'Host session is invalid or expired' })

  let { data: profile } = await db.from('host_profiles').select('user_id,display_name,role,enabled').eq('user_id', data.user.id).maybeSingle()
  if (!profile) {
    const created = await db.from('host_profiles').insert({
      user_id: data.user.id,
      display_name: data.user.user_metadata?.display_name || data.user.email || 'Host'
    }).select('user_id,display_name,role,enabled').single()
    profile = created.data
  }
  if (profile && !profile.enabled) throw createError({ statusCode: 403, statusMessage: 'This host account has been disabled' })

  return Object.assign(data.user, { hostProfile: profile })
}

export async function requireSuperAdmin(event: any) {
  const user: any = await requireHostUser(event)
  if (user.hostProfile?.role !== 'superadmin') throw createError({ statusCode: 403, statusMessage: 'Super Admin access required' })
  return user
}
