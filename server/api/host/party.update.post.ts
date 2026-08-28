import crypto from 'node:crypto'
import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'
import { effectivePartyStatus } from '../../utils/partyLifecycle'

function makeCode() {
  return crypto.randomBytes(4)
    .toString('base64url')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
    .padEnd(6, 'X')
}

async function uniqueCode(db: any) {
  let code = makeCode()
  for (let i = 0; i < 10; i++) {
    const { data } = await db.from('parties').select('id').eq('code', code).maybeSingle()
    if (!data) return code
    code = makeCode()
  }
  return `${Date.now().toString(36).slice(-6)}`.toUpperCase()
}

export default defineEventHandler(async (event) => {
  const user = await requireHostUser(event)
  const body = await readBody(event)
  const partyId = String(body?.party_id || '')
  const name = String(body?.name || '').trim()
  const queueMode = body?.queue_mode === 'automatic' ? 'automatic' : 'approval'
  const maxRequests = Number(body?.max_requests_per_guest || 3)

  if (!partyId) throw createError({ statusCode: 400, statusMessage: 'Party id is required' })
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Party name is required' })
  if (!Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > 10) {
    throw createError({ statusCode: 400, statusMessage: 'Maximum requests must be between 1 and 10' })
  }
  if (!body?.starts_at || !body?.finishes_at) {
    throw createError({ statusCode: 400, statusMessage: 'Start and finish date/time are required' })
  }

  const startsAt = new Date(body.starts_at)
  const finishesAt = new Date(body.finishes_at)
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(finishesAt.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid party date/time' })
  }
  if (finishesAt <= startsAt) {
    throw createError({ statusCode: 400, statusMessage: 'Finish time must be after start time' })
  }

  const db = useAdminSupabase()

  const { data: party, error: partyError } = await db
    .from('parties')
    .select('id,host_id,status,code')
    .eq('id', partyId)
    .maybeSingle()

  if (partyError) throw createError({ statusCode: 500, statusMessage: partyError.message })
  if (!party) throw createError({ statusCode: 404, statusMessage: 'Party not found' })
  if (party.host_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'This party belongs to another host account' })
  }

  const schedule = {
    starts_at: startsAt.toISOString(),
    finishes_at: finishesAt.toISOString()
  }

  const nextStatus = effectivePartyStatus({
    status: party.status,
    ...schedule
  })

  const reusingEndedParty = party.status === 'ended' && nextStatus !== 'ended'
  let nextCode = party.code

  if (reusingEndedParty) {
    nextCode = await uniqueCode(db)

    // Preserve played history, but close any unfinished queue entries.
    const { error: requestError } = await db
      .from('song_requests')
      .update({ status: 'removed' })
      .eq('party_id', party.id)
      .in('status', ['queued', 'playing', 'sent_to_spotify'])

    if (requestError) throw createError({ statusCode: 500, statusMessage: requestError.message })

    // Old guest tokens must not become valid again when the party is reused.
    const { error: guestError } = await db
      .from('party_guests')
      .delete()
      .eq('party_id', party.id)

    if (guestError) throw createError({ statusCode: 500, statusMessage: guestError.message })
  }

  const patch: any = {
    name,
    queue_mode: queueMode,
    max_requests_per_guest: maxRequests,
    starts_at: schedule.starts_at,
    finishes_at: schedule.finishes_at,
    status: nextStatus,
    code: nextCode
  }

  if (nextStatus === 'ended') patch.ended_at = new Date().toISOString()
  else patch.ended_at = null

  const { data: updated, error } = await db
    .from('parties')
    .update(patch)
    .eq('id', party.id)
    .eq('host_id', user.id)
    .select('id,name,code,status,queue_mode,max_requests_per_guest,starts_at,finishes_at,created_at,ended_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    party: updated,
    reused: reusingEndedParty,
    code_changed: nextCode !== party.code
  }
})
