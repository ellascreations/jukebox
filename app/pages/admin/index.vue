<script setup lang="ts">
definePageMeta({ middleware: 'host-auth' })

const { hostFetch } = useHostApi()
const supabase = useSupabaseClient()

const hosts = ref<any[]>([])
const activeParties = ref<any[]>([])
const spotifyAccessRequests = ref<any[]>([])
const spotifyAccessSummary = ref<any>({ approved: 0, pending: 0, development_limit: 5 })
const loading = ref(true)
const error = ref('')
const busy = ref('')

async function load() {
  loading.value = true
  error.value = ''

  try {
    const r:any = await hostFetch('/api/admin/overview')
    hosts.value = r.hosts || []
    activeParties.value = r.activeParties || []
    spotifyAccessRequests.value = r.spotifyAccessRequests || []
    spotifyAccessSummary.value = r.spotifyAccessSummary || { approved: 0, pending: 0, development_limit: 5 }
  } catch (e:any) {
    error.value = e?.data?.statusMessage || e?.message || 'Could not load Super Admin'
  } finally {
    loading.value = false
  }
}

async function updateHost(h:any, patch:any) {
  busy.value = h.user_id
  error.value = ''

  try {
    await hostFetch('/api/admin/host', {
      method: 'PATCH',
      body: { user_id: h.user_id, ...patch }
    })
    await load()
  } catch (e:any) {
    error.value = e?.data?.statusMessage || e?.message || 'Could not update host'
  } finally {
    busy.value = ''
  }
}


async function reviewSpotifyAccess(request:any, status:string) {
  busy.value = `spotify-${request.host_id}`
  error.value = ''
  try {
    await hostFetch('/api/admin/spotify-access', {
      method: 'PATCH',
      body: { host_id: request.host_id, status }
    })
    await load()
  } catch (e:any) {
    error.value = e?.data?.statusMessage || e?.message || 'Could not update Spotify access'
  } finally {
    busy.value = ''
  }
}

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/')
}

function formatDate(value:string) {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

onMounted(load)
</script>

<template>
  <main class="neon-page">
    <div class="neon-shell">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          <img src="/kc-jukebox-logo.png" class="w-24" alt="KC Jukebox">
          <div>
            <div class="neon-kicker">System Control</div>
            <h1 class="neon-title text-3xl">Super Admin</h1>
          </div>
        </div>

        <div class="flex gap-2">
          <NuxtLink to="/host" class="neon-btn-ghost">Host Dashboard</NuxtLink>
          <button class="neon-btn-ghost" @click="signOut">Sign Out</button>
        </div>
      </header>

      <div v-if="error" class="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
        {{ error }}
      </div>

      <section class="neon-card mt-7 overflow-hidden">
        <div class="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="neon-kicker">Live Now</div>
            <h2 class="mt-1 text-2xl font-black">Active Parties</h2>
          </div>

          <div class="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-black text-green-300">
            {{ activeParties.length }} Active
          </div>
        </div>

        <div v-if="loading" class="p-8 text-slate-500">Loading active parties…</div>

        <div v-else-if="!activeParties.length" class="p-8 text-center">
          <div class="text-lg font-black text-slate-300">No active parties</div>
          <div class="mt-1 text-sm text-slate-500">Active host parties will appear here.</div>
        </div>

        <div v-else class="divide-y divide-white/10">
          <div
            v-for="party in activeParties"
            :key="party.id"
            class="grid gap-4 p-5 lg:grid-cols-[1.4fr_.9fr_.7fr_.7fr_auto] lg:items-center"
          >
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-lg font-black text-white">{{ party.name }}</div>
                <span class="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-green-300">
                  Active
                </span>
              </div>
              <div class="mt-1 text-sm font-bold text-fuchsia-300">{{ party.host_display_name }}</div>
              <div class="text-xs text-slate-500">{{ party.host_email }}</div>
            </div>

            <div class="text-sm">
              <div class="text-slate-500">Party Code</div>
              <div class="mt-1 font-mono text-xl font-black tracking-[0.18em] text-cyan-300">{{ party.code }}</div>
            </div>

            <div class="text-sm">
              <div class="text-slate-500">Guests</div>
              <div class="font-black text-white">{{ party.guest_count }}</div>
              <div class="mt-2 text-slate-500">Queue</div>
              <div class="font-black text-white">{{ party.active_request_count }} active</div>
            </div>

            <div class="text-sm">
              <div class="text-slate-500">Mode</div>
              <div class="font-black capitalize text-violet-300">{{ party.queue_mode }}</div>
              <div class="mt-2 text-xs text-slate-600">Started {{ formatDate(party.created_at) }}</div>
            </div>

            <div class="flex flex-wrap gap-2 lg:justify-end">
              <NuxtLink
                :to="`/party/${party.code}`"
                class="neon-btn-cyan text-sm"
                target="_blank"
              >
                Open Party View
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <section class="neon-card mt-7 overflow-hidden">
        <div class="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><div class="neon-kicker">Spotify Development Mode</div><h2 class="mt-1 text-2xl font-black">Spotify Host Access</h2><p class="mt-2 text-sm text-slate-500">Add an approved host's Spotify email manually in Spotify Developer Dashboard → Users Management, then approve the request here.</p></div>
          <div class="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-right"><div class="text-xs font-black uppercase tracking-wider text-cyan-300">Approved Slots</div><div class="mt-1 text-2xl font-black text-white">{{ spotifyAccessSummary.approved }} / {{ spotifyAccessSummary.development_limit }}</div><div class="text-xs text-amber-300">{{ spotifyAccessSummary.pending }} pending</div></div>
        </div>
        <div v-if="!spotifyAccessRequests.length" class="p-8 text-slate-500">No Spotify access requests yet.</div>
        <div v-else class="divide-y divide-white/10">
          <div v-for="r in spotifyAccessRequests" :key="r.host_id" class="grid gap-4 p-5 lg:grid-cols-[1.2fr_1.2fr_.7fr_auto] lg:items-center">
            <div><div class="font-black text-white">{{ r.display_name || r.email }}</div><div class="text-sm text-slate-500">KC account: {{ r.email }}</div></div>
            <div><div class="text-xs uppercase tracking-wider text-slate-600">Spotify email</div><div class="font-bold text-cyan-300">{{ r.spotify_email || 'Not supplied' }}</div></div>
            <div><span class="rounded-full border px-3 py-1 text-xs font-black uppercase" :class="r.status==='approved'?'border-green-500/30 bg-green-500/10 text-green-400':r.status==='pending'?'border-amber-500/30 bg-amber-500/10 text-amber-300':'border-red-500/30 bg-red-500/10 text-red-300'">{{ r.status }}</span><div class="mt-2 text-xs text-slate-600">{{ r.connected ? 'Spotify connected' : 'Not connected' }}</div></div>
            <div class="flex flex-wrap gap-2 lg:justify-end"><button v-if="r.status!=='approved'" class="neon-btn-cyan text-sm" :disabled="busy===`spotify-${r.host_id}`" @click="reviewSpotifyAccess(r,'approved')">Approve</button><button v-if="r.status!=='denied'" class="neon-btn-ghost text-sm" :disabled="busy===`spotify-${r.host_id}`" @click="reviewSpotifyAccess(r,'denied')">Deny</button></div>
          </div>
        </div>
      </section>

      <section class="neon-card mt-7 overflow-hidden">
        <div class="border-b border-white/10 p-5">
          <div class="neon-kicker">Accounts</div>
          <h2 class="mt-1 text-2xl font-black">Registered Hosts</h2>
        </div>

        <div v-if="loading" class="p-8 text-slate-500">Loading hosts…</div>

        <div v-else class="divide-y divide-white/10">
          <div
            v-for="h in hosts"
            :key="h.user_id"
            class="grid gap-4 p-5 lg:grid-cols-[1.4fr_.8fr_.7fr_auto] lg:items-center"
          >
            <div>
              <div class="font-black text-white">{{ h.display_name || h.email }}</div>
              <div class="text-sm text-slate-500">{{ h.email }}</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <span class="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-[11px] font-black uppercase text-fuchsia-300">{{ h.role }}</span>
                <span
                  :class="h.enabled ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-red-300 border-red-500/30 bg-red-500/10'"
                  class="rounded-full border px-2 py-1 text-[11px] font-black uppercase"
                >
                  {{ h.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
            </div>

            <div class="text-sm">
              <div class="text-slate-500">Spotify</div>
              <div class="font-bold" :class="h.spotify ? 'text-green-400' : 'text-slate-600'">
                {{ h.spotify ? (h.spotify.display_name || 'Connected') : 'Not connected' }}
              </div>
            </div>

            <div class="text-sm">
              <div class="text-slate-500">Parties</div>
              <div class="font-bold text-cyan-300">{{ h.party_count }} total · {{ h.active_party_count }} active</div>
            </div>

            <div class="flex flex-wrap gap-2 lg:justify-end">
              <button
                class="neon-btn-ghost text-sm"
                :disabled="busy === h.user_id"
                @click="updateHost(h, { enabled: !h.enabled })"
              >
                {{ h.enabled ? 'Disable' : 'Enable' }}
              </button>
              <button
                class="neon-btn-cyan text-sm"
                :disabled="busy === h.user_id"
                @click="updateHost(h, { role: h.role === 'superadmin' ? 'host' : 'superadmin' })"
              >
                {{ h.role === 'superadmin' ? 'Make Host' : 'Make Super Admin' }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
