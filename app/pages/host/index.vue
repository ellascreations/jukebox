<script setup lang="ts">
definePageMeta({ middleware: 'host-auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { hostFetch } = useHostApi()
const status = ref<any>(null)
const parties = ref<any[]>([])
const name = ref('')
const maxRequests = ref(3)
const queueMode = ref<'automatic' | 'approval'>('automatic')
const creating = ref(false)
const connecting = ref(false)
const error = ref('')
const route = useRoute()

async function load() {
  try {
    status.value = await hostFetch('/api/host/status')
    const data:any = await hostFetch('/api/host/parties')
    parties.value = data.parties || []
  } catch (e:any) {
    if (e?.statusCode !== 401) error.value = e?.data?.statusMessage || e?.message || 'Could not load host account'
  }
}

async function connectSpotify() {
  connecting.value = true
  error.value = ''
  try {
    const result:any = await hostFetch('/api/spotify/login')
    window.location.assign(result.url)
  } catch (e:any) {
    error.value = e?.data?.statusMessage || e?.message || 'Could not start Spotify connection'
    connecting.value = false
  }
}

async function createParty(){
  creating.value=true; error.value=''
  try {
    const p:any = await hostFetch('/api/parties/create',{method:'POST',body:{name:name.value,max_requests_per_guest:maxRequests.value,queue_mode:queueMode.value}})
    await navigateTo(`/host/${p.id}?code=${p.code}`)
  }
  catch(e:any){ error.value=e?.data?.statusMessage || e?.message || 'Could not create party' }
  finally{ creating.value=false }
}

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/')
}

onMounted(async () => {
  if (route.query.spotify === 'not-premium') error.value = 'That Spotify account is not Premium. Please connect a Spotify Premium account.'
  await load()
})
</script>

<template>
<main class="min-h-screen px-4 py-10">
  <div class="mx-auto max-w-5xl">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <NuxtLink to="/" class="text-sm text-slate-400 hover:text-white">← Party Jukebox</NuxtLink>
        <h1 class="mt-4 text-4xl font-black">Host Dashboard</h1>
        <p class="mt-2 text-slate-400">Signed in as {{ status?.host?.display_name || user?.user_metadata?.display_name || user?.email }}</p>
      </div>
      <button class="btn-secondary" @click="signOut">Sign Out</button>
    </div>

    <div v-if="error" class="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{{ error }}</div>

    <div class="mt-7 grid gap-5 lg:grid-cols-2">
      <section class="glass rounded-3xl p-6">
        <h2 class="text-xl font-black">Spotify Premium</h2>
        <div v-if="status?.connected" class="mt-5 flex items-center justify-between gap-4">
          <div>
            <div class="text-sm text-slate-400">Connected account</div>
            <div class="font-bold">{{ status.connection?.display_name || 'Spotify Host' }}</div>
            <div class="mt-1 text-xs uppercase tracking-wider text-green-400">Premium</div>
          </div>
          <button class="btn-secondary" @click="connectSpotify" :disabled="connecting">{{ connecting ? 'Connecting…' : 'Change Spotify' }}</button>
        </div>
        <div v-else class="mt-5">
          <p class="text-slate-400">Connect your own Spotify Premium account. Its playback devices and queue will be used for your parties.</p>
          <button @click="connectSpotify" :disabled="connecting" class="btn-primary mt-5">{{ connecting ? 'Connecting…' : 'Connect Spotify' }}</button>
        </div>
      </section>

      <section class="glass rounded-3xl p-6">
        <h2 class="text-xl font-black">Create a Party</h2>
        <p v-if="!status?.connected" class="mt-3 text-slate-400">Connect Spotify first to start hosting.</p>
        <div v-else class="mt-5 space-y-4">
          <div><label class="mb-2 block text-sm font-bold text-slate-300">Party name</label><input v-model="name" class="input" placeholder="Saturday Night Party"></div>
          <div><label class="mb-2 block text-sm font-bold text-slate-300">Maximum active requests per guest</label><input v-model.number="maxRequests" class="input" min="1" max="10" type="number"></div>
          <div>
            <label class="mb-2 block text-sm font-bold text-slate-300">Guest request mode</label>
            <div class="grid gap-3 sm:grid-cols-2">
              <button type="button" @click="queueMode='automatic'" class="rounded-2xl border p-4 text-left transition" :class="queueMode==='automatic' ? 'border-green-400 bg-green-500/10' : 'border-white/10 bg-white/5'"><div class="font-black">Automatic</div><div class="mt-1 text-sm text-slate-400">Requests go directly into your Spotify queue.</div></button>
              <button type="button" @click="queueMode='approval'" class="rounded-2xl border p-4 text-left transition" :class="queueMode==='approval' ? 'border-green-400 bg-green-500/10' : 'border-white/10 bg-white/5'"><div class="font-black">Approval</div><div class="mt-1 text-sm text-slate-400">You approve each guest request.</div></button>
            </div>
          </div>
          <button :disabled="creating || !name.trim()" @click="createParty" class="btn-primary">{{ creating ? 'Creating…' : 'Start Party' }}</button>
        </div>
      </section>
    </div>

    <section class="mt-7">
      <div class="flex items-center justify-between"><h2 class="text-2xl font-black">Your Parties</h2><span class="text-sm text-slate-500">Latest 20</span></div>
      <div class="mt-4 grid gap-3">
        <NuxtLink v-for="p in parties" :key="p.id" :to="`/host/${p.id}?code=${p.code}`" class="glass flex flex-col gap-3 rounded-2xl p-4 transition hover:border-green-400/30 sm:flex-row sm:items-center sm:justify-between">
          <div><div class="font-bold">{{ p.name }}</div><div class="mt-1 text-sm text-slate-400">Code {{ p.code }} · {{ p.queue_mode === 'automatic' ? 'Automatic' : 'Approval' }}</div></div>
          <span class="rounded-full bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider" :class="p.status === 'active' ? 'text-green-400' : 'text-slate-400'">{{ p.status }}</span>
        </NuxtLink>
        <div v-if="status && !parties.length" class="rounded-3xl border border-dashed border-white/10 p-10 text-center text-slate-500">You have not created a party yet.</div>
      </div>
    </section>
  </div>
</main>
</template>
