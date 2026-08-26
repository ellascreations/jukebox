import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

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

  if (party.status === 'ended') {
    return { success: true, party }
  }

  const endedAt = new Date().toISOString()
  const { data: ended, error } = await db
    .from('parties')
    .update({ status: 'ended', ended_at: endedAt })
    .eq('id', party.id)
    .eq('host_id', user.id)
    .select('id,name,code,status,ended_at')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // Requests already sent to Spotify cannot be removed from Spotify's queue.
  // We only close the KC Jukebox party so old codes/tokens can no longer act on it.
  return { success: true, party: ended }
})
