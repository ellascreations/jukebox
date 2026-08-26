# Spotify Party Jukebox

Standalone Nuxt 4 party jukebox. One Spotify Premium host connects Spotify; guests join with a code or QR and can search, request and vote for songs.

## Current MVP

- Spotify Authorization Code OAuth with server-side refresh tokens
- Host party creation
- 6-character party codes
- QR code guest joining
- Anonymous guest display names
- Spotify track search
- Maximum active requests per guest
- Duplicate-track protection
- One vote per guest per request
- Host playback status
- Host Skip button
- Host Add Next button to send a request to Spotify's playback queue
- Polling every 3 seconds for a simple first deployment

## Setup

1. Create a fresh Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Copy `.env.example` to `.env` and fill in the values.
4. In Spotify Developer Dashboard create an app.
5. Add this exact development redirect URI:
   `http://localhost:3000/api/spotify/callback`
6. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Spotify scopes

- `user-read-private`
- `user-read-email`
- `user-read-playback-state`
- `user-modify-playback-state`

The playback queue endpoints require the host Spotify account to be Premium.

## Netlify deployment

Set the same environment variables in Netlify. Change:

- `SPOTIFY_REDIRECT_URI=https://YOUR-DOMAIN/api/spotify/callback`
- `NUXT_PUBLIC_APP_URL=https://YOUR-DOMAIN`

Then add that exact production callback URL to the Spotify app redirect URI allowlist.

## Important security notes

Spotify access and refresh tokens are stored in Supabase and accessed only by server routes using the service-role key. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `SPOTIFY_CLIENT_SECRET` in public/runtime client configuration.

## Recommended next upgrades

- Supabase Realtime instead of 3-second polling
- host pause/play and Spotify device selector
- remove/reorder requests
- party lock/end controls
- explicit/blocked song filtering
- guest bans/rate limiting
- automatic queue feeder
- played-song history and Save as Spotify Playlist
- optional party PIN
