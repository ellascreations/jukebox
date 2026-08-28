import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const user = await requireHostUser(event)
  const partyId = String(getQuery(event).party_id || '')

  if (!partyId) {
    throw createError({ statusCode: 400, statusMessage: 'Party id is required' })
  }

  const db = useAdminSupabase()

  const { data: party, error: lookupError } = await db
    .from('parties')
    .select('id,host_id,name')
    .eq('id', partyId)
    .maybeSingle()

  if (lookupError) throw createError({ statusCode: 500, statusMessage: lookupError.message })
  if (!party) throw createError({ statusCode: 404, statusMessage: 'Party not found' })
  if (party.host_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'This party belongs to another host account' })
  }

  const { error } = await db
    .from('parties')
    .delete()
    .eq('id', party.id)
    .eq('host_id', user.id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, deleted_party_id: party.id, name: party.name }
})
