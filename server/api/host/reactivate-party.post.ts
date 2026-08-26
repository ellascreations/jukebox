import crypto from 'node:crypto'
import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

function makeCode() {
  return crypto.randomBytes(4).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6).padEnd(6, 'X')
}

export default defineEventHandler(async (event) => {
  const user = await requireHostUser(event)
  const body = await readBody(event)
  const partyId = String(body?.party_id || '')

  if (!partyId) {
    throw createError({ statusCode: 400, statusMessage: 'Party id is required' })
  }

  const db = useAdminSupabase()

  const { data: party, error: partyError } = await db
    .from('parties')
    .select('id,host_id,status,name,code')
    .eq('id', partyId)
    .maybeSingle()

  if (partyError || !party) {
    throw createError({ statusCode: 404, statusMessage: 'Party not found' })
  }

  if (party.host_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'This party belongs to another host account' })
  }

  if (party.status !== 'ended') {
    return { success: true, party }
  }

  // Generate a fresh code so old saved codes cannot regain access.
  let newCode = makeCode()
  for (let i = 0; i < 8; i++) {
    const { data: existing } = await db.from('parties').select('id').eq('code', newCode).maybeSingle()
    if (!existing) break
    newCode = makeCode()
  }

  // Close any stale queue items from the previous session while preserving them as history.
  const { error: requestError } = await db
    .from('song_requests')
    .update({ status: 'removed' })
    .eq('party_id', party.id)
    .in('status', ['queued', 'playing', 'sent_to_spotify'])

  if (requestError) {
    throw createError({ statusCode: 500, statusMessage: requestError.message })
  }

  // Deleting guests invalidates every old guest_token. Votes cascade; song history remains.
  const { error: guestError } = await db
    .from('party_guests')
    .delete()
    .eq('party_id', party.id)

  if (guestError) {
    throw createError({ statusCode: 500, statusMessage: guestError.message })
  }

  const { data: reactivated, error } = await db
    .from('parties')
    .update({ status: 'active', ended_at: null, code: newCode })
    .eq('id', party.id)
    .eq('host_id', user.id)
    .select('id,name,code,status,ended_at,queue_mode,max_requests_per_guest')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, party: reactivated }
})
