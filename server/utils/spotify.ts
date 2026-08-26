import { useAdminSupabase } from './adminSupabase'

export async function getSpotifyAccessToken(connectionId: string) {
  const db = useAdminSupabase()
  const { data: connection, error } = await db.from('spotify_connections').select('*').eq('id', connectionId).single()
  if (error || !connection) throw createError({ statusCode: 401, statusMessage: 'Spotify connection not found' })

  const expiresAt = new Date(connection.expires_at).getTime()
  if (expiresAt > Date.now() + 60_000) return connection.access_token

  const config = useRuntimeConfig()
  const basic = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64')
  const token = await $fetch<any>('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: connection.refresh_token }).toString()
  })

  const newExpiry = new Date(Date.now() + token.expires_in * 1000).toISOString()
  await db.from('spotify_connections').update({
    access_token: token.access_token,
    refresh_token: token.refresh_token || connection.refresh_token,
    expires_at: newExpiry,
    updated_at: new Date().toISOString()
  }).eq('id', connectionId)

  return token.access_token
}

export async function spotifyFetch<T>(connectionId: string, path: string, options: any = {}) {
  const accessToken = await getSpotifyAccessToken(connectionId)
  return await $fetch<T>(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` }
  })
}
