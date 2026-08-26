import { useAdminSupabase } from '../../utils/adminSupabase'
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = useAdminSupabase()
  const { data: guest } = await db.from('party_guests').select('id').eq('guest_token',body.guest_token).maybeSingle()
  if (!guest) throw createError({statusCode:401,statusMessage:'Guest session invalid'})
  const { error } = await db.from('song_votes').insert({request_id:body.request_id,guest_id:guest.id})
  if (error && error.code !== '23505') throw createError({statusCode:500,statusMessage:error.message})
  const { count } = await db.from('song_votes').select('*',{count:'exact',head:true}).eq('request_id',body.request_id)
  await db.from('song_requests').update({votes:count || 0}).eq('id',body.request_id)
  return { votes: count || 0 }
})
