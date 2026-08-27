import { requireSuperAdmin } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const db = useAdminSupabase()

  const [
    { data: profiles },
    { data: parties },
    { data: connections },
    { data: spotifyAccess },
    { data: guests },
    { data: requests },
    usersResult
  ] = await Promise.all([
    db.from('host_profiles').select('user_id,display_name,role,enabled,created_at').order('created_at', { ascending: false }),
    db.from('parties').select('id,host_id,name,code,status,queue_mode,created_at,ended_at').order('created_at', { ascending: false }),
    db.from('spotify_connections').select('host_id,display_name,product'),
    db.from('spotify_host_access').select('host_id,spotify_email,status,requested_at,reviewed_at').order('requested_at', { ascending: false }),
    db.from('party_guests').select('id,party_id'),
    db.from('song_requests').select('id,party_id,status').in('status', ['queued','playing','sent_to_spotify']),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ])

  const users = usersResult.data?.users || []
  const profileRows = profiles || []
  const partyRows = parties || []
  const guestRows = guests || []
  const requestRows = requests || []

  const hosts = profileRows.map((p:any) => {
    const auth = users.find((u:any) => u.id === p.user_id)
    const conn = (connections || []).find((c:any) => c.host_id === p.user_id)
    const owned = partyRows.filter((x:any) => x.host_id === p.user_id)
    const access = (spotifyAccess || []).find((a:any) => a.host_id === p.user_id)

    return {
      ...p,
      email: auth?.email || '',
      last_sign_in_at: auth?.last_sign_in_at || null,
      spotify: conn ? { display_name: conn.display_name, product: conn.product } : null,
      spotify_access: access || { status: 'not_requested', spotify_email: null, requested_at: null, reviewed_at: null },
      party_count: owned.length,
      active_party_count: owned.filter((x:any) => x.status === 'active').length
    }
  })

  const activeParties = partyRows
    .filter((party:any) => party.status === 'active')
    .map((party:any) => {
      const profile = profileRows.find((p:any) => p.user_id === party.host_id)
      const auth = users.find((u:any) => u.id === party.host_id)

      return {
        ...party,
        host_display_name: profile?.display_name || auth?.email || 'Unknown host',
        host_email: auth?.email || '',
        guest_count: guestRows.filter((g:any) => g.party_id === party.id).length,
        active_request_count: requestRows.filter((r:any) => r.party_id === party.id).length
      }
    })

  const spotifyAccessRequests = hosts
    .filter((h:any) => h.spotify_access?.status && h.spotify_access.status !== 'not_requested')
    .map((h:any) => ({
      host_id: h.user_id,
      display_name: h.display_name,
      email: h.email,
      connected: !!h.spotify,
      ...h.spotify_access
    }))

  return {
    hosts,
    activeParties,
    spotifyAccessRequests,
    spotifyAccessSummary: {
      approved: spotifyAccessRequests.filter((x:any) => x.status === 'approved').length,
      pending: spotifyAccessRequests.filter((x:any) => x.status === 'pending').length,
      development_limit: 5
    }
  }
})
