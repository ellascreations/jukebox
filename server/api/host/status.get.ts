import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const user:any = await requireHostUser(event)
  const db = useAdminSupabase()

  const [{ data: connection }, { data: access }] = await Promise.all([
    db.from('spotify_connections')
      .select('id,display_name,spotify_user_id,product')
      .eq('host_id', user.id)
      .maybeSingle(),
    db.from('spotify_host_access')
      .select('spotify_email,status,requested_at,reviewed_at')
      .eq('host_id', user.id)
      .maybeSingle()
  ])

  return {
    connected: !!connection,
    connection: connection || null,
    spotifyAccess: access || {
      spotify_email: null,
      status: 'not_requested',
      requested_at: null,
      reviewed_at: null
    },
    host: {
      id: user.id,
      email: user.email,
      display_name: user.hostProfile?.display_name || user.user_metadata?.display_name || user.user_metadata?.name || null,
      role: user.hostProfile?.role || 'host'
    }
  }
})
