import { requireHostId } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'
import { spotifyFetch } from '../../utils/spotify'

export default defineEventHandler(async (event) => {
  const hostId = requireHostId(event)
  const partyId = String(getQuery(event).party_id || '')
  const db = useAdminSupabase()

  const { data: party } = await db
    .from('parties')
    .select('id,spotify_connection_id')
    .eq('id', partyId)
    .eq('host_id', hostId)
    .single()

  if (!party) throw createError({ statusCode: 403, statusMessage: 'Not your party' })

  try {
    const p: any = await spotifyFetch(party.spotify_connection_id, '/me/player')

    if (!p?.item) {
      return { active: !!p, is_playing: p?.is_playing || false, progress_ms: p?.progress_ms || 0, device: p?.device || null, item: null }
    }

    const currentUri = String(p.item.uri || '')

    if (currentUri) {
      // Anything previously marked as playing is finished/skipped once Spotify
      // reports a different current track.
      await db
        .from('song_requests')
        .update({ status: 'played' })
        .eq('party_id', party.id)
        .eq('status', 'playing')
        .neq('spotify_uri', currentUri)

      // If the current Spotify track came from this party, promote it from
      // queued/sent_to_spotify to playing. Use the oldest active matching
      // request in case the same track was requested again later.
      const { data: currentRequest } = await db
        .from('song_requests')
        .select('id,status')
        .eq('party_id', party.id)
        .eq('spotify_uri', currentUri)
        .in('status', ['queued', 'sent_to_spotify', 'playing'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (currentRequest && currentRequest.status !== 'playing') {
        await db
          .from('song_requests')
          .update({ status: 'playing' })
          .eq('id', currentRequest.id)
      }
    }

    return {
      active: !!p,
      is_playing: p?.is_playing || false,
      progress_ms: p?.progress_ms || 0,
      device: p?.device || null,
      item: {
        name: p.item.name,
        artist: p.item.artists?.map((a: any) => a.name).join(', '),
        image: p.item.album?.images?.[0]?.url,
        duration_ms: p.item.duration_ms,
        spotify_uri: p.item.uri || null
      }
    }
  } catch {
    return { active: false, item: null }
  }
})
