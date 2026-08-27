import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const guestToken = String(body?.guest_token || '')

  if (!guestToken) {
    throw createError({ statusCode: 400, statusMessage: 'Guest token is required' })
  }

  const db = useAdminSupabase()
  const { data: guest, error: guestError } = await db
    .from('party_guests')
    .select('id,party_id')
    .eq('guest_token', guestToken)
    .maybeSingle()

  if (guestError || !guest) {
    throw createError({ statusCode: 401, statusMessage: 'Guest session is no longer valid' })
  }

  const { data: party } = await db
    .from('parties')
    .select('id,status')
    .eq('id', guest.party_id)
    .maybeSingle()

  if (!party || party.status !== 'active') {
    throw createError({ statusCode: 410, statusMessage: 'This party is no longer active' })
  }

  const seenAt = new Date().toISOString()
  const { error } = await db
    .from('party_guests')
    .update({ last_seen_at: seenAt })
    .eq('id', guest.id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ok: true, last_seen_at: seenAt }
})
