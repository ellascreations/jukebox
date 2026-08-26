import { requireHostUser } from '../../utils/host'
import { adminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const host = await requireHostUser(event)
  const partyId = String(getQuery(event).party_id || '')

  if (!partyId) {
    throw createError({ statusCode: 400, statusMessage: 'Party id is required' })
  }

  const db = adminSupabase()
  const { data: party, error } = await db
    .from('parties')
    .select('id,name,code,status,queue_mode,max_requests_per_guest,created_at,ended_at,host_id')
    .eq('id', partyId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!party) throw createError({ statusCode: 404, statusMessage: 'Party not found' })
  if (party.host_id !== host.id) {
    throw createError({ statusCode: 403, statusMessage: 'This party belongs to another host account' })
  }

  return { party }
})
