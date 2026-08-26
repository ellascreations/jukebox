import crypto from 'node:crypto'
import { getOrCreateHostId } from '../../utils/host'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const hostId = getOrCreateHostId(event)
  const state = crypto.randomBytes(20).toString('hex')
  setCookie(event, 'spotify_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/' })
  setCookie(event, 'spotify_oauth_host', hostId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/' })

  const scopes = ['user-read-private','user-read-email','user-read-playback-state','user-modify-playback-state']
  const params = new URLSearchParams({ client_id: config.spotifyClientId, response_type: 'code', redirect_uri: config.spotifyRedirectUri, state, scope: scopes.join(' ') })
  return sendRedirect(event, `https://accounts.spotify.com/authorize?${params.toString()}`)
})
