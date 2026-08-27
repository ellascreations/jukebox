import { useAdminSupabase } from '../../utils/adminSupabase'

function clearSpotifyOAuthCookies(event: any) {
  const options = { path: '/' }
  deleteCookie(event, 'spotify_oauth_state', options)
  deleteCookie(event, 'spotify_oauth_host', options)
  deleteCookie(event, 'spotify_oauth_redirect', options)
}

function statusFromError(error: any) {
  return Number(
    error?.response?.status ||
    error?.statusCode ||
    error?.status ||
    0
  )
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const savedState = getCookie(event, 'spotify_oauth_state')
  const hostId = getCookie(event, 'spotify_oauth_host')
  const savedRedirect = getCookie(event, 'spotify_oauth_redirect')
  const config = useRuntimeConfig()

  if (query.error) {
    clearSpotifyOAuthCookies(event)
    return sendRedirect(event, `/host?spotify=denied&reason=${encodeURIComponent(String(query.error))}`)
  }

  if (!query.code || !query.state || !savedState || query.state !== savedState || !hostId) {
    clearSpotifyOAuthCookies(event)
    return sendRedirect(event, '/host?spotify=state-error')
  }

  const requestUrl = getRequestURL(event)
  const fallbackRedirect = `${requestUrl.protocol}//${requestUrl.host}/api/spotify/callback`
  const redirectUri = String(savedRedirect || config.spotifyRedirectUri || fallbackRedirect).trim()

  let token: any
  try {
    const basic = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64')
    token = await $fetch<any>('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(query.code),
        redirect_uri: redirectUri
      }).toString()
    })
  } catch (error: any) {
    clearSpotifyOAuthCookies(event)
    const status = statusFromError(error)
    const detail = error?.data?.error_description || error?.data?.error || ''
    const reason = encodeURIComponent(String(detail).slice(0, 180))
    return sendRedirect(event, `/host?spotify=token-error&status=${status}${reason ? `&reason=${reason}` : ''}`)
  }

  let profile: any
  try {
    profile = await $fetch<any>('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    })
  } catch (error: any) {
    clearSpotifyOAuthCookies(event)
    const status = statusFromError(error)
    if (status === 403) {
      return sendRedirect(event, '/host?spotify=forbidden')
    }
    return sendRedirect(event, `/host?spotify=profile-error&status=${status}`)
  }

  clearSpotifyOAuthCookies(event)

  if (profile.product !== 'premium') {
    return sendRedirect(event, '/host?spotify=not-premium')
  }

  const db = useAdminSupabase()
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()
  const { data: existing, error: lookupError } = await db
    .from('spotify_connections')
    .select('id,refresh_token')
    .eq('host_id', hostId)
    .maybeSingle()

  if (lookupError) {
    return sendRedirect(event, '/host?spotify=save-error')
  }

  const values = {
    spotify_user_id: profile.id,
    display_name: profile.display_name,
    product: profile.product,
    access_token: token.access_token,
    refresh_token: token.refresh_token || existing?.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString()
  }

  const saveResult = existing
    ? await db.from('spotify_connections').update(values).eq('id', existing.id)
    : await db.from('spotify_connections').insert({ host_id: hostId, ...values })

  if (saveResult.error) {
    return sendRedirect(event, '/host?spotify=save-error')
  }

  return sendRedirect(event, '/host?spotify=connected')
})
