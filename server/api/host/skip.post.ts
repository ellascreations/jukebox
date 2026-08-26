import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'
import { spotifyFetch } from '../../utils/spotify'
export default defineEventHandler(async (event) => {
  const user = await requireHostUser(event)
  const hostId = user.id
  const body = await readBody(event)
  const db = useAdminSupabase()
  const { data: party } = await db.from('parties').select('spotify_connection_id').eq('id',body.party_id).eq('host_id',hostId).single()
  if (!party) throw createError({statusCode:403,statusMessage:'Not your party'})
  await spotifyFetch(party.spotify_connection_id,'/me/player/next',{method:'POST'})
  return {ok:true}
})
