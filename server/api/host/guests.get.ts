import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const user = await requireHostUser(event)
  const partyId = String(getQuery(event).party_id || '')

  if (!partyId) {
    throw createError({ statusCode: 400, statusMessage: 'Party id is required' })
  }

  const db = useAdminSupabase()
  const { data: party, error: partyError } = await db
    .from('parties')
    .select('id,host_id,status')
    .eq('id', partyId)
    .maybeSingle()

  if (partyError || !party) {
    throw createError({ statusCode: 404, statusMessage: 'Party not found' })
  }

  if (party.host_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'This party belongs to another host account' })
  }

  const { data: guests, error } = await db
    .from('party_guests')
    .select('id,display_name,created_at,last_seen_at')
    .eq('party_id', partyId)
    .order('last_seen_at', { ascending: false, nullsFirst: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const guestIds = (guests || []).map((guest: any) => guest.id)
  let counts = new Map<string, number>()

  if (guestIds.length) {
    const { data: requests } = await db
      .from('song_requests')
      .select('guest_id')
      .eq('party_id', partyId)
      .in('guest_id', guestIds)

    counts = (requests || []).reduce((map: Map<string, number>, row: any) => {
      if (row.guest_id) map.set(row.guest_id, (map.get(row.guest_id) || 0) + 1)
      return map
    }, new Map<string, number>())
  }

  const now = Date.now()
  const onlineThresholdMs = 30_000
  const result = (guests || []).map((guest: any) => {
    const lastSeen = guest.last_seen_at ? new Date(guest.last_seen_at).getTime() : 0
    return {
      ...guest,
      online: !!lastSeen && now - lastSeen <= onlineThresholdMs,
      request_count: counts.get(guest.id) || 0
    }
  })

  return {
    guests: result,
    online_count: result.filter((guest: any) => guest.online).length
  }
})
