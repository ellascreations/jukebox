import { useAdminSupabase } from '../../utils/adminSupabase'
import { syncPartyLifecycle } from '../../utils/partyLifecycle'
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event,'code')?.toUpperCase()
  const db = useAdminSupabase()
  const { data: party, error } = await db.from('parties').select('id,name,code,status,max_requests_per_guest,queue_mode,created_at,starts_at,finishes_at').eq('code', code).single()
  if (error || !party) throw createError({ statusCode: 404, statusMessage: 'Party not found' })
  const syncedParty = await syncPartyLifecycle(party)
  const { data: requests } = await db.from('song_requests').select('*').eq('party_id', party.id).in('status',['queued','playing','sent_to_spotify']).order('votes',{ascending:false}).order('created_at',{ascending:true})
  return { party: syncedParty, requests: requests || [] }
})
