<script setup lang="ts">
definePageMeta({ middleware: 'host-auth' })
import QRCode from 'qrcode'

const route = useRoute()
const partyId = String(route.params.id)
const code = String(route.query.code || '')
const config = useRuntimeConfig()
const { hostFetch } = useHostApi()

const qr = ref('')
const playback = ref<any>(null)
const party = ref<any>(null)
const requests = ref<any[]>([])
const busy = ref<string | null>(null)
const endingParty = ref(false)
const error = ref('')

const progressPercent = computed(() => {
  const duration = Number(playback.value?.item?.duration_ms || 0)
  const progress = Number(playback.value?.progress_ms || 0)
  if (!duration) return 0
  return Math.min(100, Math.max(0, (progress / duration) * 100))
})

function formatTime(ms: number) {
  const totalSeconds = Math.floor((Number(ms) || 0) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

async function load() {
  if (code) {
    try {
      const data: any = await $fetch(`/api/parties/${code}`)
      party.value = data.party
      requests.value = data.requests || []
    } catch {}
  }

  try {
    playback.value = await hostFetch('/api/host/playback', { query: { party_id: partyId } })
  } catch (e: any) {
    if (e?.statusCode === 403) error.value = 'This party belongs to another host account.'
  }
}

async function sendToSpotify(request: any) {
  busy.value = request.id
  error.value = ''
  try {
    await hostFetch('/api/host/queue', {
      method: 'POST',
      body: { party_id: partyId, request_id: request.id }
    })
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Could not add that request to Spotify.'
  } finally {
    busy.value = null
  }
}


async function endParty() {
  if (!confirm('End this party? The party code and all existing guest sessions will stop accepting requests and votes.')) return

  endingParty.value = true
  error.value = ''
  try {
    await hostFetch('/api/host/end-party', {
      method: 'POST',
      body: { party_id: partyId }
    })
    await navigateTo('/host')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Could not end the party.'
  } finally {
    endingParty.value = false
  }
}

async function skip() {
  error.value = ''
  try {
    await hostFetch('/api/host/skip', { method: 'POST', body: { party_id: partyId } })
    setTimeout(load, 700)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Could not skip the current track.'
  }
}

let timer: any
onMounted(async () => {
  if (code) {
    const url = `${String(config.public.appUrl).replace(/\/$/, '')}/party/${code}`
    qr.value = await QRCode.toDataURL(url, { width: 360, margin: 1 })
  }
  await load()
  timer = setInterval(load, 3000)
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <main class="kc-host-shell">
    <aside class="kc-sidebar">
      <div class="kc-brand-wrap">
        <img src="/kc-jukebox-logo.png" alt="KC Jukebox" class="kc-logo" />
      </div>

      <nav class="kc-nav">
        <NuxtLink to="/host" class="kc-nav-item kc-nav-primary">
          <span class="kc-nav-icon">⌂</span>
          <span>Host Dashboard</span>
        </NuxtLink>
        <a href="#now-playing" class="kc-nav-item">
          <span class="kc-nav-icon">♫</span>
          <span>Now Playing</span>
        </a>
        <a href="#guest-queue" class="kc-nav-item">
          <span class="kc-nav-icon">☷</span>
          <span>Guest Queue</span>
        </a>
        <a href="#party-code" class="kc-nav-item">
          <span class="kc-nav-icon">⌗</span>
          <span>Party Code</span>
        </a>
        <button type="button" class="kc-nav-item text-left text-red-400" :disabled="endingParty" @click="endParty">
          <span class="kc-nav-icon">⏻</span>
          <span>{{ endingParty ? 'Ending Party…' : 'End Party' }}</span>
        </button>
      </nav>

      <div class="kc-sidebar-footer">
        <div class="font-bold text-slate-300">KC Jukebox</div>
        <div class="mt-1 text-xs text-slate-600">Play it. Love it. Party to it.</div>
      </div>
    </aside>

    <section class="kc-main">
      <header class="kc-topbar">
        <div>
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-black sm:text-3xl">{{ party?.name || 'Party Jukebox' }}</h1>
            <span class="kc-active-pill"><span class="kc-active-dot"></span>ACTIVE</span>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>{{ party?.queue_mode === 'automatic' ? 'Automatic queue' : 'Host approval' }}</span>
            <span>•</span>
            <span>Spotify powered</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="kc-code-chip">Party Code: <strong>{{ code }}</strong></div>
          <button type="button" class="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50" :disabled="endingParty" @click="endParty">
            {{ endingParty ? 'Ending…' : 'End Party' }}
          </button>
          <NuxtLink to="/host" class="btn-secondary">Dashboard</NuxtLink>
        </div>
      </header>

      <div v-if="error" class="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 lg:mx-8">
        {{ error }}
      </div>

      <div class="kc-content">
        <section id="now-playing" class="kc-now-card">
          <div class="kc-section-label">NOW PLAYING</div>
          <div class="kc-now-layout">
            <div class="kc-album-wrap">
              <img v-if="playback?.item?.image" :src="playback.item.image" class="kc-album-art" alt="Album artwork" />
              <div v-else class="kc-album-placeholder">♫</div>
            </div>

            <div class="min-w-0 flex-1">
              <h2 class="truncate text-3xl font-black sm:text-4xl">
                {{ playback?.item?.name || 'Start Spotify playback' }}
              </h2>
              <p class="mt-2 truncate text-lg text-slate-400 sm:text-xl">
                {{ playback?.item?.artist || 'Choose a Spotify Connect device' }}
              </p>

              <div v-if="playback?.device" class="mt-4 flex items-center gap-2 text-sm text-green-400">
                <span>▣</span>
                <span>Playing on {{ playback.device.name }}</span>
              </div>

              <div class="mt-7">
                <div class="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div class="kc-progress" :style="{ width: `${progressPercent}%` }"></div>
                </div>
                <div class="mt-2 flex justify-between text-xs text-slate-500">
                  <span>{{ formatTime(playback?.progress_ms || 0) }}</span>
                  <span>{{ formatTime(playback?.item?.duration_ms || 0) }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside class="kc-control-card">
          <div class="kc-control-icon">⏭</div>
          <h2 class="mt-3 text-xl font-black">Host Playback</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500">
            Spotify controls the active device and audio. Skip moves to the next Spotify track.
          </p>
          <button @click="skip" class="kc-skip-btn mt-6">Skip Track →</button>

          <div v-if="playback?.device" class="kc-device-box mt-5">
            <div class="text-xs font-bold uppercase tracking-widest text-slate-500">Active device</div>
            <div class="mt-1 font-bold text-slate-200">{{ playback.device.name }}</div>
            <div v-if="playback.device.volume_percent != null" class="mt-1 text-sm text-slate-500">Volume {{ playback.device.volume_percent }}%</div>
          </div>
        </aside>

        <section id="guest-queue" class="kc-queue-card">
          <div class="kc-queue-head">
            <div>
              <div class="kc-section-label purple">GUEST QUEUE</div>
              <p class="mt-1 text-sm text-slate-500">Highest votes first</p>
            </div>
            <div class="kc-mode-pill" :class="party?.queue_mode === 'automatic' ? 'automatic' : 'approval'">
              {{ party?.queue_mode === 'automatic' ? '⚡ AUTOMATIC MODE' : '✓ APPROVAL MODE' }}
            </div>
          </div>

          <div class="kc-queue-list">
            <article v-for="request in requests" :key="request.id" class="kc-queue-row">
              <div class="kc-vote-count">{{ request.votes }}</div>
              <img v-if="request.image_url" :src="request.image_url" class="kc-track-thumb" alt="" />
              <div v-else class="kc-track-thumb kc-track-placeholder">♫</div>

              <div class="min-w-0 flex-1">
                <div class="truncate text-base font-black sm:text-lg">{{ request.track_name }}</div>
                <div class="truncate text-sm text-slate-400">{{ request.artist_name }}</div>
                <div class="mt-1 truncate text-xs text-slate-600">Requested by {{ request.requested_by }}</div>
              </div>

              <div class="kc-row-action">
                <span v-if="request.status === 'playing'" class="kc-status playing">Now Playing</span>
                <span v-else-if="request.status === 'sent_to_spotify'" class="kc-status queued">Queued in Spotify</span>
                <button
                  v-else-if="party?.queue_mode !== 'automatic'"
                  @click="sendToSpotify(request)"
                  :disabled="busy === request.id"
                  class="kc-add-btn"
                >
                  {{ busy === request.id ? 'Adding…' : 'Add Next' }}
                </button>
                <button
                  v-else
                  @click="sendToSpotify(request)"
                  :disabled="busy === request.id"
                  class="kc-retry-btn"
                >
                  {{ busy === request.id ? 'Retrying…' : 'Retry Spotify' }}
                </button>
              </div>
            </article>

            <div v-if="!requests.length" class="p-12 text-center text-slate-600">
              Guest requests will appear here.
            </div>
          </div>
        </section>

        <aside id="party-code" class="kc-party-card">
          <div class="kc-section-label cyan">REQUEST A SONG</div>
          <p class="mt-2 text-sm text-slate-500">Guests scan this code with their phone.</p>
          <img v-if="qr" :src="qr" class="kc-qr" alt="Party QR code" />
          <div class="kc-big-code">{{ code }}</div>
          <div class="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-center text-xs text-slate-500">
            {{ party?.queue_mode === 'automatic' ? 'Guest requests queue automatically in Spotify.' : 'Guest requests wait for host approval.' }}
          </div>
        </aside>
      </div>

      <section class="mx-4 mb-8 rounded-2xl border border-red-500/40 bg-red-950/20 p-5 shadow-[0_0_28px_rgba(239,68,68,0.12)] lg:mx-8">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="text-xs font-black uppercase tracking-[0.2em] text-red-400">HOST CONTROLS</div>
            <h2 class="mt-1 text-xl font-black text-white">End this party</h2>
            <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
              Ending the party disables the party code and immediately stops existing guest sessions from requesting songs or voting.
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-xl border border-red-400/70 bg-red-500/15 px-6 py-3 font-black uppercase tracking-wider text-red-200 shadow-[0_0_18px_rgba(239,68,68,0.2)] transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="endingParty"
            @click="endParty"
          >
            {{ endingParty ? 'ENDING PARTY…' : '⏻ END PARTY' }}
          </button>
        </div>
      </section>

      <footer class="kc-footer">♔ &nbsp; KC Jukebox — Powered by Spotify</footer>
    </section>
  </main>
</template>
