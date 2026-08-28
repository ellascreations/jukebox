import { useAdminSupabase } from './adminSupabase'

const PRE_START_MS = 15 * 60 * 1000
const POST_END_MS = 60 * 60 * 1000

export function effectivePartyStatus(party: any, now = Date.now()) {
  if (!party) return 'ended'
  if (!party.starts_at || !party.finishes_at) return party.status || 'active'
  const starts = new Date(party.starts_at).getTime()
  const finishes = new Date(party.finishes_at).getTime()
  if (now < starts - PRE_START_MS) return 'scheduled'
  if (now <= finishes + POST_END_MS) return 'active'
  return 'ended'
}

export async function syncPartyLifecycle(party: any) {
  if (!party) return party
  const nextStatus = effectivePartyStatus(party)
  if (nextStatus === party.status) return party
  const db = useAdminSupabase()
  const patch: any = { status: nextStatus, ended_at: nextStatus === 'ended' ? new Date().toISOString() : null }
  const { data, error } = await db.from('parties').update(patch).eq('id', party.id).select('*').single()
  return error ? { ...party, ...patch } : data
}
