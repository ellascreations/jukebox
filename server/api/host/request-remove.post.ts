import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const user = await requireHostUser(event)
  const body = await readBody(event)
  const partyId = String(body?.party_id || '')
  const requestId = String(body?.request_id || '')

  if (!partyId || !requestId) {
    throw createError({ statusCode: 400, statusMessage: 'party_id and request_id are required' })
  }

  const db = useAdminSupabase()

  const { data: party } = await db
    .from('parties')
    .select('id')
    .eq('id', partyId)
    .eq('host_id', user.id)
    .single()

  if (!party) {
    throw createError({ statusCode: 403, statusMessage: 'Not your party' })
  }

  const { data: request } = await db
    .from('song_requests')
    .select('id,status,track_name')
    .eq('id', requestId)
    .eq('party_id', party.id)
    .single()

  if (!request) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found' })
  }

  if (request.status === 'playing') {
    throw createError({ statusCode: 409, statusMessage: 'This track is currently playing. Use Skip Track instead.' })
  }

  if (request.status === 'played' || request.status === 'removed') {
    return { ok: true, alreadyRemoved: true, wasSentToSpotify: false }
  }

  const wasSentToSpotify = request.status === 'sent_to_spotify'

  const { error } = await db
    .from('song_requests')
    .update({ status: 'removed' })
    .eq('id', request.id)
    .eq('party_id', party.id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return {
    ok: true,
    wasSentToSpotify,
    message: wasSentToSpotify
      ? 'Removed from the jukebox. Spotify may still play it because Spotify does not allow removing one specific queued track through the Web API.'
      : 'Request removed.'
  }
})
