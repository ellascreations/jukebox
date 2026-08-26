import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const user = await requireHostUser(event)
  const db = useAdminSupabase()
  const { data, error } = await db
    .from('parties')
    .select('id,name,code,status,queue_mode,created_at,ended_at')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { parties: data || [] }
})
