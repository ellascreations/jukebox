import { useAdminSupabase } from '../../utils/adminSupabase'
import { spotifyFetch } from '../../utils/spotify'
export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q || '').trim()
  const code = String(getQuery(event).code || '').toUpperCase()
  if (q.length < 2) return { tracks: [] }
  const db = useAdminSupabase()
  const { data: party } = await db.from('parties').select('spotify_connection_id').eq('code', code).eq('status','active').maybeSingle()
  if (!party) throw createError({ statusCode: 404, statusMessage: 'Party not found' })
  const result = await spotifyFetch<any>(party.spotify_connection_id, `/search?${new URLSearchParams({q,type:'track',limit:'10',market:'AU'}).toString()}`)
  return { tracks: (result.tracks?.items || []).map((t:any) => ({ id:t.id, uri:t.uri, name:t.name, artist:t.artists?.map((a:any)=>a.name).join(', '), album:t.album?.name, image:t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || null, duration_ms:t.duration_ms })) }
})
