import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const user = await requireHostUser(event)
  const db = useAdminSupabase()
  const { data } = await db
    .from('spotify_connections')
    .select('id,display_name,spotify_user_id,product')
    .eq('host_id', user.id)
    .maybeSingle()

  return {
    connected: !!data,
    connection: data || null,
    host: {
      id: user.id,
      email: user.email,
      display_name: (user as any).hostProfile?.display_name || user.user_metadata?.display_name || user.user_metadata?.name || null,
      role: (user as any).hostProfile?.role || 'host'
    }
  }
})
