import crypto from 'node:crypto'

export function getOrCreateHostId(event: any) {
  let hostId = getCookie(event, 'jukebox_host_id')
  if (!hostId) {
    hostId = crypto.randomUUID()
    setCookie(event, 'jukebox_host_id', hostId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/'
    })
  }
  return hostId
}

export function requireHostId(event: any) {
  const hostId = getCookie(event, 'jukebox_host_id')
  if (!hostId) throw createError({ statusCode: 401, statusMessage: 'Host session not found' })
  return hostId
}
