import { requireSuperAdmin } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const admin:any = await requireSuperAdmin(event)
  const body = await readBody(event)
  const hostId = String(body?.host_id || '')
  const status = String(body?.status || '')

  if (!hostId) throw createError({ statusCode: 400, statusMessage: 'Host id is required' })
  if (!['approved','denied','pending'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Spotify access status' })
  }

  const db = useAdminSupabase()
  const { data: existing, error: findError } = await db
    .from('spotify_host_access')
    .select('host_id,spotify_email,status')
    .eq('host_id', hostId)
    .maybeSingle()

  if (findError) throw createError({ statusCode: 500, statusMessage: findError.message })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Spotify access request not found' })
  if (status === 'approved' && !existing.spotify_email) {
    throw createError({ statusCode: 400, statusMessage: 'This request does not contain a Spotify email address' })
  }

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('spotify_host_access')
    .update({
      status,
      reviewed_at: status === 'pending' ? null : now,
      reviewed_by: status === 'pending' ? null : admin.id,
      updated_at: now
    })
    .eq('host_id', hostId)
    .select('host_id,spotify_email,status,requested_at,reviewed_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { access: data }
})
