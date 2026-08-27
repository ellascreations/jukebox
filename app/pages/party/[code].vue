<script setup lang="ts">
const route = useRoute()
const code = String(route.params.code).toUpperCase()
const guestToken = useCookie<string | null>(`party_guest_${code}`, { maxAge: 60 * 60 * 24 })
const guestName = ref('')
const joined = ref(!!guestToken.value)
const query = ref('')
const tracks = ref<any[]>([])
const searching = ref(false)
const message = ref('')

const { data, refresh } = await useFetch(`/api/parties/${code}`)
const { data: playback, refresh: refreshPlayback } = await useFetch(`/api/parties/${code}/playback`)
const playbackProgress = computed(() => {
  const duration = Number(playback.value?.item?.duration_ms || 0)
  const progress = Number(playback.value?.progress_ms || 0)
  if (!duration) return 0
  return Math.min(100, Math.max(0, (progress / duration) * 100))
})
const partyEnded = computed(() => data.value?.party?.status === 'ended')
const partyActive = computed(() => data.value?.party?.status === 'active')

watch(partyEnded, (ended) => {
  if (ended) {
    tracks.value = []
    message.value = 'This party has ended. New requests and votes are now closed.'
  }
}, { immediate: true })

let timer: any
let heartbeatTimer: any

async function heartbeat() {
  if (!joined.value || !guestToken.value || !partyActive.value) return
  try {
    await $fetch('/api/parties/heartbeat', {
      method: 'POST',
      body: { guest_token: guestToken.value }
    })
  } catch {}
}

onMounted(() => {
  heartbeat()
  timer = setInterval(() => {
    refresh()
    refreshPlayback()
  }, 3000)
  heartbeatTimer = setInterval(heartbeat, 10000)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  clearInterval(heartbeatTimer)
})

async function join() {
  message.value = ''
  try {
    const g: any = await $fetch('/api/parties/join', {
      method: 'POST',
      body: { code, display_name: guestName.value }
    })
    guestToken.value = g.guest_token
    joined.value = true
    await heartbeat()
  } catch (e: any) {
    message.value = e?.data?.statusMessage || e?.statusMessage || 'Could not join this party.'
    await refresh()
  }
}

async function search() {
  if (!partyActive.value || query.value.trim().length < 2) return
  searching.value = true
  message.value = ''
  try {
    const r: any = await $fetch('/api/spotify/search', { query: { q: query.value, code } })
    tracks.value = r.tracks
  } catch (e: any) {
    message.value = e?.data?.statusMessage || e?.statusMessage || 'Could not search Spotify.'
    await refresh()
  } finally {
    searching.value = false
  }
}

async function request(track: any) {
  if (!partyActive.value) return
  message.value = ''
  try {
    await $fetch('/api/parties/request', { method: 'POST', body: { guest_token: guestToken.value, track } })
    message.value = `Added ${track.name}`
    await refresh()
  } catch (e: any) {
    message.value = e?.data?.statusMessage || e?.statusMessage || 'Could not add request'
    await refresh()
  }
}

async function vote(id: string) {
  if (!partyActive.value) return
  try {
    await $fetch('/api/parties/vote', { method: 'POST', body: { guest_token: guestToken.value, request_id: id } })
    await refresh()
  } catch (e: any) {
    message.value = e?.data?.statusMessage || e?.statusMessage || 'Could not vote.'
    await refresh()
  }
}
</script>

<template>
  <main class="neon-page min-h-screen">
    <div class="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <header class="text-center">
        <img src="/kc-jukebox-logo.png" alt="KC Jukebox" class="neon-logo max-w-[200px]">
        <div v-if="data?.party" class="mt-3">
          <div class="neon-kicker">Party Code</div>
          <div class="neon-code mt-2">{{ data.party.code }}</div>
          <h1 class="mt-3 text-2xl font-black">{{ data.party.name }}</h1>
          <p v-if="partyActive" class="mt-1 text-sm text-slate-500">Search, request and vote for what plays next.</p>
          <p v-else class="mt-1 font-bold text-red-300">This party has ended.</p>
        </div>
      </header>

      <section v-if="partyEnded" class="neon-card mx-auto mt-7 max-w-xl border-red-500/30 p-7 text-center sm:p-9">
        <div class="text-5xl text-red-400">⏻</div>
        <h2 class="mt-4 text-3xl font-black text-white">Party Ended</h2>
        <p class="mx-auto mt-3 max-w-md leading-7 text-slate-400">
          The host has closed this party. This party code and existing guest session can no longer request songs or vote.
        </p>
        <NuxtLink to="/" class="neon-btn mt-6 inline-block">Return to KC Jukebox</NuxtLink>
      </section>

      <section v-else-if="!joined" class="neon-card mx-auto mt-7 max-w-lg p-6 sm:p-8">
        <div class="text-center">
          <div class="neon-cyan text-4xl">♫</div>
          <h2 class="neon-title mt-3 text-2xl">Join the Party</h2>
          <p class="mt-2 text-sm text-slate-500">Choose a name so everyone can see who requested each track.</p>
        </div>
        <input v-model="guestName" @keyup.enter="join" class="neon-input mt-6 text-center" maxlength="40" placeholder="Your name">
        <button @click="join" :disabled="!guestName.trim()" class="neon-btn mt-3 w-full">Join Party</button>
        <div v-if="message" class="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{{ message }}</div>
      </section>

      <template v-else>
        <section class="neon-card mt-7 p-4 sm:p-5">
          <div class="flex items-center gap-4">
            <div class="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950 sm:h-20 sm:w-20">
              <img v-if="playback?.item?.image" :src="playback.item.image" :alt="playback.item.name" class="h-full w-full object-cover">
              <div v-else class="flex h-full w-full items-center justify-center text-2xl text-cyan-300">♫</div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full" :class="playback?.is_playing ? 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,.9)]' : 'bg-slate-600'"></span>
                <div class="neon-kicker text-cyan-300">Now Playing</div>
              </div>
              <template v-if="playback?.item">
                <div class="mt-1 truncate text-lg font-black text-white sm:text-xl">{{ playback.item.name }}</div>
                <div class="truncate text-sm text-slate-400">{{ playback.item.artist }}</div>
                <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div class="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 transition-all duration-500" :style="{ width: `${playbackProgress}%` }"></div>
                </div>
              </template>
              <div v-else class="mt-1 text-sm text-slate-500">Nothing is playing right now.</div>
            </div>
          </div>
        </section>

        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <section class="neon-card p-5 sm:p-6">
          <div class="neon-kicker text-fuchsia-400">Request a Song</div>
          <div class="mt-4 flex flex-col gap-2 sm:flex-row">
            <input v-model="query" @keyup.enter="search" class="neon-input" placeholder="Search for a song or artist…">
            <button @click="search" class="neon-btn-cyan sm:w-auto">{{ searching ? 'Searching…' : 'Search' }}</button>
          </div>
          <div v-if="message" class="mt-3 rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-300">{{ message }}</div>
          <div class="mt-5 space-y-2">
            <div v-for="t in tracks" :key="t.id" class="neon-track">
              <img v-if="t.image" :src="t.image" class="h-14 w-14 rounded-lg object-cover">
              <div class="min-w-0 flex-1"><div class="truncate font-black">{{ t.name }}</div><div class="truncate text-sm text-slate-500">{{ t.artist }}</div></div>
              <button @click="request(t)" class="neon-btn px-4 py-2 text-sm">Request</button>
            </div>
          </div>
        </section>

        <section class="lg:sticky lg:top-6">
          <div class="neon-card p-5 sm:p-6">
          <div class="flex items-end justify-between">
            <div><div class="neon-kicker">Guest Queue</div><h2 class="mt-1 text-2xl font-black">Up Next</h2></div>
            <div class="text-xs text-slate-600">Vote for favourites</div>
          </div>
          <div class="mt-4 space-y-3">
            <div v-for="r in data?.requests" :key="r.id" class="neon-track">
              <img v-if="r.image_url" :src="r.image_url" class="h-16 w-16 rounded-xl object-cover">
              <div class="min-w-0 flex-1"><div class="truncate font-black">{{ r.track_name }}</div><div class="truncate text-sm text-slate-500">{{ r.artist_name }}</div><div class="mt-1 text-xs text-slate-600">Requested by {{ r.requested_by }}</div></div>
              <button @click="vote(r.id)" class="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 font-black text-violet-300 transition hover:bg-violet-500/20">👍 {{ r.votes }}</button>
            </div>
            <div v-if="!data?.requests?.length" class="rounded-2xl border border-dashed border-violet-500/20 bg-slate-950/30 p-8 text-center text-slate-600">No requests yet. Be the first.</div>
          </div>
          </div>
        </section>
        </div>
      </template>
    </div>
    <nav v-if="joined && partyActive" class="neon-bottom-nav"><div class="text-fuchsia-400">♫<br>Request</div><div>☷<br>Queue</div><div>◉<br>Party</div></nav>
  </main>
</template>
