import crypto from 'node:crypto'
import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'
import { effectivePartyStatus } from '../../utils/partyLifecycle'

function code() { return crypto.randomBytes(4).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6).padEnd(6,'X') }
export default defineEventHandler(async (event) => {
  const user = await requireHostUser(event)
  const hostId = user.id
  const body = await readBody(event)
  if (!body?.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Party name is required' })
  if (!body?.starts_at || !body?.finishes_at) throw createError({ statusCode: 400, statusMessage: 'Start and finish date/time are required' })
  const startsAt = new Date(body.starts_at)
  const finishesAt = new Date(body.finishes_at)
  if (finishesAt <= startsAt) throw createError({ statusCode: 400, statusMessage: 'Finish time must be after start time' })
  const db = useAdminSupabase()
  const { data: connection } = await db.from('spotify_connections').select('id').eq('host_id', hostId).maybeSingle()
  if (!connection) throw createError({ statusCode: 400, statusMessage: 'Connect Spotify first' })
  let partyCode = code()
  for (let i=0;i<5;i++) {
    const { data } = await db.from('parties').select('id').eq('code', partyCode).maybeSingle()
    if (!data) break
    partyCode = code()
  }
  const schedule = { starts_at: startsAt.toISOString(), finishes_at: finishesAt.toISOString() }
  const { data, error } = await db.from('parties').insert({
    host_id: hostId, spotify_connection_id: connection.id, name: body.name.trim(), code: partyCode,
    status: effectivePartyStatus({ status: 'scheduled', ...schedule }),
    max_requests_per_guest: Number(body.max_requests_per_guest || 3),
    queue_mode: body.queue_mode === 'automatic' ? 'automatic' : 'approval', ...schedule
  }).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
