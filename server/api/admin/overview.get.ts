import { requireSuperAdmin } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const db = useAdminSupabase()
  const [{ data: profiles }, { data: parties }, { data: connections }, usersResult] = await Promise.all([
    db.from('host_profiles').select('user_id,display_name,role,enabled,created_at').order('created_at', { ascending: false }),
    db.from('parties').select('id,host_id,status'),
    db.from('spotify_connections').select('host_id,display_name,product'),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ])
  const users = usersResult.data?.users || []
  const hosts = (profiles || []).map((p:any) => {
    const auth = users.find((u:any) => u.id === p.user_id)
    const conn = (connections || []).find((c:any) => c.host_id === p.user_id)
    const owned = (parties || []).filter((x:any) => x.host_id === p.user_id)
    return {
      ...p,
      email: auth?.email || '',
      last_sign_in_at: auth?.last_sign_in_at || null,
      spotify: conn ? { display_name: conn.display_name, product: conn.product } : null,
      party_count: owned.length,
      active_party_count: owned.filter((x:any) => x.status === 'active').length
    }
  })
  return { hosts }
})
