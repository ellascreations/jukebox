import crypto from 'node:crypto'
import { useAdminSupabase } from '../../utils/adminSupabase'
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = useAdminSupabase()
  const { data: party } = await db.from('parties').select('id,code,status').eq('code', String(body.code || '').toUpperCase()).maybeSingle()
  if (!party || party.status !== 'active') throw createError({ statusCode: 404, statusMessage: 'Active party not found' })
  const guestToken = crypto.randomBytes(24).toString('hex')
  const { data, error } = await db.from('party_guests').insert({ party_id: party.id, display_name: String(body.display_name || 'Guest').slice(0,40), guest_token: guestToken }).select('id,display_name,guest_token').single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
