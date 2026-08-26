import { useAdminSupabase } from '../../utils/adminSupabase'
import { spotifyFetch } from '../../utils/spotify'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = useAdminSupabase()

  const { data: guest } = await db
    .from('party_guests')
    .select('id,party_id,display_name')
    .eq('guest_token', body.guest_token)
    .maybeSingle()

  if (!guest) throw createError({ statusCode: 401, statusMessage: 'Guest session invalid' })

  const { data: party } = await db
    .from('parties')
    .select('max_requests_per_guest,status,queue_mode,spotify_connection_id')
    .eq('id', guest.party_id)
    .single()

  if (!party || party.status !== 'active') {
    throw createError({ statusCode: 400, statusMessage: 'Party is not active' })
  }

  const { count } = await db
    .from('song_requests')
    .select('*', { count: 'exact', head: true })
    .eq('party_id', guest.party_id)
    .eq('guest_id', guest.id)
    .in('status', ['queued', 'playing', 'sent_to_spotify'])

  if ((count || 0) >= party.max_requests_per_guest) {
    throw createError({
      statusCode: 429,
      statusMessage: `You can only have ${party.max_requests_per_guest} active requests`
    })
  }

  const { data: duplicate } = await db
    .from('song_requests')
    .select('id')
    .eq('party_id', guest.party_id)
    .eq('spotify_track_id', body.track.id)
    .in('status', ['queued', 'playing', 'sent_to_spotify'])
    .maybeSingle()

  if (duplicate) {
    throw createError({ statusCode: 409, statusMessage: 'That song is already in the queue' })
  }

  const { data: request, error } = await db
    .from('song_requests')
    .insert({
      party_id: guest.party_id,
      guest_id: guest.id,
      requested_by: guest.display_name,
      spotify_track_id: body.track.id,
      spotify_uri: body.track.uri,
      track_name: body.track.name,
      artist_name: body.track.artist,
      album_name: body.track.album,
      image_url: body.track.image,
      duration_ms: body.track.duration_ms,
      status: 'queued',
      votes: 0
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (party.queue_mode === 'automatic') {
    try {
      await spotifyFetch(
        party.spotify_connection_id,
        `/me/player/queue?uri=${encodeURIComponent(request.spotify_uri)}`,
        { method: 'POST' }
      )

      const { data: updated } = await db
        .from('song_requests')
        .update({ status: 'sent_to_spotify' })
        .eq('id', request.id)
        .select()
        .single()

      return { ...(updated || request), queue_mode: 'automatic', sent_to_spotify: true }
    } catch (e: any) {
      // Keep the request queued so the host can still approve it manually.
      return {
        ...request,
        queue_mode: 'automatic',
        sent_to_spotify: false,
        spotify_error: e?.data?.statusMessage || e?.message || 'Could not add to Spotify queue'
      }
    }
  }

  return { ...request, queue_mode: 'approval', sent_to_spotify: false }
})
