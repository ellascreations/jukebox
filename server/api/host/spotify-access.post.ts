import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const user:any = await requireHostUser(event)
  const body = await readBody(event)
  const spotifyEmail = String(body?.spotify_email || '').trim().toLowerCase()

  if (!spotifyEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(spotifyEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter the email address used by your Spotify account' })
  }

  const db = useAdminSupabase()

  const { data: existing } = await db
    .from('spotify_host_access')
    .select('status')
    .eq('host_id', user.id)
    .maybeSingle()

  if (existing?.status === 'approved') {
    throw createError({ statusCode: 400, statusMessage: 'Spotify access is already approved for this host' })
  }

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('spotify_host_access')
    .upsert({
      host_id: user.id,
      spotify_email: spotifyEmail,
      status: 'pending',
      requested_at: now,
      reviewed_at: null,
      reviewed_by: null,
      updated_at: now
    }, { onConflict: 'host_id' })
    .select('host_id,spotify_email,status,requested_at,reviewed_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { access: data }
})
