import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const savedState = getCookie(event, 'spotify_oauth_state')
  const hostId = getCookie(event, 'spotify_oauth_host')
  if (!query.code || !query.state || query.state !== savedState || !hostId) throw createError({ statusCode: 400, statusMessage: 'Invalid Spotify OAuth state' })

  const config = useRuntimeConfig()
  const basic = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64')
  const token = await $fetch<any>('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: String(query.code), redirect_uri: config.spotifyRedirectUri }).toString()
  })
  const profile = await $fetch<any>('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${token.access_token}` } })
  const db = useAdminSupabase()
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()
  const { data: existing } = await db.from('spotify_connections').select('id').eq('host_id', hostId).maybeSingle()
  if (existing) {
    await db.from('spotify_connections').update({ spotify_user_id: profile.id, display_name: profile.display_name, access_token: token.access_token, refresh_token: token.refresh_token, expires_at: expiresAt, updated_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await db.from('spotify_connections').insert({ host_id: hostId, spotify_user_id: profile.id, display_name: profile.display_name, access_token: token.access_token, refresh_token: token.refresh_token, expires_at: expiresAt })
  }
  deleteCookie(event, 'spotify_oauth_state', { path: '/' })
  deleteCookie(event, 'spotify_oauth_host', { path: '/' })
  return sendRedirect(event, '/host?spotify=connected')
})
