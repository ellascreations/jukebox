import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = useAdminSupabase()

  const { data: guest } = await db
    .from('party_guests')
    .select('id,party_id')
    .eq('guest_token', body.guest_token)
    .maybeSingle()

  if (!guest) {
    throw createError({ statusCode: 401, statusMessage: 'Guest session invalid' })
  }

  const { data: party } = await db
    .from('parties')
    .select('id,status')
    .eq('id', guest.party_id)
    .maybeSingle()

  if (!party || party.status !== 'active') {
    throw createError({ statusCode: 410, statusMessage: 'This party has ended' })
  }

  const { data: request } = await db
    .from('song_requests')
    .select('id,party_id,status')
    .eq('id', body.request_id)
    .eq('party_id', guest.party_id)
    .maybeSingle()

  if (!request || !['queued', 'playing', 'sent_to_spotify'].includes(request.status)) {
    throw createError({ statusCode: 404, statusMessage: 'Active song request not found' })
  }

  const { error } = await db
    .from('song_votes')
    .insert({ request_id: request.id, guest_id: guest.id })

  if (error && error.code !== '23505') {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const { count } = await db
    .from('song_votes')
    .select('*', { count: 'exact', head: true })
    .eq('request_id', request.id)

  await db.from('song_requests').update({ votes: count || 0 }).eq('id', request.id)
  return { votes: count || 0 }
})
