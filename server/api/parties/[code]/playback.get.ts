import { useAdminSupabase } from '../../../utils/adminSupabase'
import { spotifyFetch } from '../../../utils/spotify'

export default defineEventHandler(async (event) => {
  const code = String(getRouterParam(event, 'code') || '').toUpperCase()
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Party code is required' })
  }

  const db = useAdminSupabase()
  const { data: party, error } = await db
    .from('parties')
    .select('id,status,spotify_connection_id')
    .eq('code', code)
    .maybeSingle()

  if (error || !party) {
    throw createError({ statusCode: 404, statusMessage: 'Party not found' })
  }

  if (party.status !== 'active' || !party.spotify_connection_id) {
    return { active: false, is_playing: false, progress_ms: 0, item: null }
  }

  try {
    const p: any = await spotifyFetch(party.spotify_connection_id, '/me/player')

    if (!p?.item) {
      return {
        active: !!p,
        is_playing: p?.is_playing || false,
        progress_ms: p?.progress_ms || 0,
        item: null
      }
    }

    return {
      active: !!p,
      is_playing: p?.is_playing || false,
      progress_ms: p?.progress_ms || 0,
      item: {
        name: p.item.name,
        artist: p.item.artists?.map((a: any) => a.name).join(', '),
        image: p.item.album?.images?.[0]?.url,
        duration_ms: p.item.duration_ms
      }
    }
  } catch {
    return { active: false, is_playing: false, progress_ms: 0, item: null }
  }
})
