import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'
import { spotifyFetch } from '../../utils/spotify'
export default defineEventHandler(async (event) => {
  const user = await requireHostUser(event)
  const hostId = user.id
  const body = await readBody(event)
  const db = useAdminSupabase()
  const { data: party } = await db.from('parties').select('id,spotify_connection_id').eq('id',body.party_id).eq('host_id',hostId).single()
  if (!party) throw createError({statusCode:403,statusMessage:'Not your party'})
  const { data:req } = await db.from('song_requests').select('*').eq('id',body.request_id).eq('party_id',party.id).single()
  if (!req) throw createError({statusCode:404,statusMessage:'Request not found'})
  await spotifyFetch(party.spotify_connection_id, `/me/player/queue?uri=${encodeURIComponent(req.spotify_uri)}`, {method:'POST'})
  await db.from('song_requests').update({status:'sent_to_spotify'}).eq('id',req.id)
  return {ok:true}
})
