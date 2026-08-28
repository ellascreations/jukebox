import crypto from 'node:crypto'
import { useAdminSupabase } from '../../utils/adminSupabase'
import { syncPartyLifecycle } from '../../utils/partyLifecycle'
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = useAdminSupabase()
  const { data: party } = await db.from('parties').select('id,code,status,starts_at,finishes_at').eq('code', String(body.code || '').toUpperCase()).maybeSingle()
  const syncedParty = party ? await syncPartyLifecycle(party) : null
  if (!syncedParty) throw createError({ statusCode: 404, statusMessage: 'Party not found' })
  if (syncedParty.status === 'ended') throw createError({ statusCode: 410, statusMessage: 'This party has ended' })
  if (!['scheduled','active'].includes(syncedParty.status)) throw createError({ statusCode: 403, statusMessage: 'This party is not available to join' })
  const guestToken = crypto.randomBytes(24).toString('hex')
  const now = new Date().toISOString()
  const { data, error } = await db.from('party_guests').insert({ party_id: party.id, display_name: String(body.display_name || 'Guest').slice(0,40), guest_token: guestToken, last_seen_at: now }).select('id,display_name,guest_token').single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
