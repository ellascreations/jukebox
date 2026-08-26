import { useAdminSupabase } from './adminSupabase'

export async function requireHostUser(event: any) {
  const authorization = getHeader(event, 'authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Host sign-in required' })
  }

  const db = useAdminSupabase()
  const { data, error } = await db.auth.getUser(token)

  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'Host session is invalid or expired' })
  }

  return data.user
}
