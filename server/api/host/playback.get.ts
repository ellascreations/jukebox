import { requireHostId } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'
import { spotifyFetch } from '../../utils/spotify'
export default defineEventHandler(async (event) => {
  const hostId = requireHostId(event)
  const partyId = String(getQuery(event).party_id || '')
  const db = useAdminSupabase()
  const { data: party } = await db.from('parties').select('spotify_connection_id').eq('id',partyId).eq('host_id',hostId).single()
  if (!party) throw createError({statusCode:403,statusMessage:'Not your party'})
  try {
    const p:any = await spotifyFetch(party.spotify_connection_id,'/me/player')
    return { active:!!p, is_playing:p?.is_playing || false, progress_ms:p?.progress_ms || 0, device:p?.device || null, item:p?.item ? {name:p.item.name,artist:p.item.artists?.map((a:any)=>a.name).join(', '),image:p.item.album?.images?.[0]?.url,duration_ms:p.item.duration_ms} : null }
  } catch { return {active:false,item:null} }
})
