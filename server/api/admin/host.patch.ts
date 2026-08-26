import { requireSuperAdmin } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const admin:any = await requireSuperAdmin(event)
  const body = await readBody(event)
  const userId = String(body?.user_id || '')
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'Host user id is required' })
  if (userId === admin.id && body.enabled === false) throw createError({ statusCode: 400, statusMessage: 'You cannot disable your own Super Admin account' })
  if (userId === admin.id && body.role && body.role !== 'superadmin') throw createError({ statusCode: 400, statusMessage: 'You cannot remove your own Super Admin role' })

  const update:any = { updated_at: new Date().toISOString() }
  if (typeof body.enabled === 'boolean') update.enabled = body.enabled
  if (body.role === 'host' || body.role === 'superadmin') update.role = body.role

  const db = useAdminSupabase()
  const { data, error } = await db.from('host_profiles').update(update).eq('user_id', userId).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
