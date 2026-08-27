import crypto from 'node:crypto'
import { requireHostUser } from '../../utils/host'
import { useAdminSupabase } from '../../utils/adminSupabase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const user:any = await requireHostUser(event)
  const db = useAdminSupabase()
  const { data: access } = await db.from('spotify_host_access').select('status,spotify_email').eq('host_id', user.id).maybeSingle()
  const { data: existingConnection } = await db.from('spotify_connections').select('id').eq('host_id', user.id).maybeSingle()

  // Existing working connections remain reconnectable for backward compatibility.
  if (!existingConnection && access?.status !== 'approved') {
    throw createError({
      statusCode: 403,
      statusMessage: access?.status === 'pending'
        ? 'Spotify host access is awaiting Super Admin approval'
        : 'Request Spotify host access before connecting your account'
    })
  }

  const state = crypto.randomBytes(20).toString('hex')

  const requestUrl = getRequestURL(event)
  const fallbackRedirect = `${requestUrl.protocol}//${requestUrl.host}/api/spotify/callback`
  const redirectUri = String(config.spotifyRedirectUri || fallbackRedirect).trim()

  if (!config.spotifyClientId || !config.spotifyClientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Spotify is not configured on this server'
    })
  }

  setCookie(event, 'spotify_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/'
  })

  setCookie(event, 'spotify_oauth_host', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/'
  })

  // Store the exact redirect URI used to start OAuth so the callback uses
  // precisely the same value during the token exchange.
  setCookie(event, 'spotify_oauth_redirect', redirectUri, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/'
  })

  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state'
  ]

  const params = new URLSearchParams({
    client_id: String(config.spotifyClientId),
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
    scope: scopes.join(' ')
  })

  return { url: `https://accounts.spotify.com/authorize?${params.toString()}` }
})
