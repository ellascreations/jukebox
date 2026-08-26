import { getOrCreateHostId } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'
export default defineEventHandler(async (event) => {
  const hostId = getOrCreateHostId(event)
  const db = useAdminSupabase()
  const { data } = await db.from('spotify_connections').select('id,display_name,spotify_user_id').eq('host_id', hostId).maybeSingle()
  return { connected: !!data, connection: data || null }
})
