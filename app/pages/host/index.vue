<script setup lang="ts">
definePageMeta({ middleware: 'host-auth' })
const supabase = useSupabaseClient(); const user = useSupabaseUser(); const { hostFetch } = useHostApi()
const status=ref<any>(null); const parties=ref<any[]>([]); const name=ref(''); const maxRequests=ref(3); const queueMode=ref<'automatic'|'approval'>('automatic')
const creating=ref(false); const connecting=ref(false); const error=ref(''); const route=useRoute()
async function load(){try{status.value=await hostFetch('/api/host/status'); const data:any=await hostFetch('/api/host/parties'); parties.value=data.parties||[]}catch(e:any){if(e?.statusCode!==401) error.value=e?.data?.statusMessage||e?.message||'Could not load host account'}}
async function connectSpotify(){connecting.value=true; error.value=''; try{const result:any=await hostFetch('/api/spotify/login'); window.location.assign(result.url)}catch(e:any){error.value=e?.data?.statusMessage||e?.message||'Could not start Spotify connection'; connecting.value=false}}
async function createParty(){creating.value=true; error.value=''; try{const p:any=await hostFetch('/api/parties/create',{method:'POST',body:{name:name.value,max_requests_per_guest:maxRequests.value,queue_mode:queueMode.value}}); await navigateTo(`/host/${p.id}?code=${p.code}`)}catch(e:any){error.value=e?.data?.statusMessage||e?.message||'Could not create party'}finally{creating.value=false}}
async function signOut(){await supabase.auth.signOut(); await navigateTo('/')}
onMounted(async()=>{if(route.query.spotify==='not-premium') error.value='That Spotify account is not Premium. Please connect a Spotify Premium account.'; await load()})
</script>
<template>
<main class="neon-page">
  <div class="neon-shell">
    <header class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-4"><img src="/kc-jukebox-logo.png" class="w-24 sm:w-28" alt="KC Jukebox"><div><div class="neon-kicker">Host Control Centre</div><h1 class="neon-title mt-1 text-3xl sm:text-4xl">Host Dashboard</h1><p class="mt-1 text-sm text-slate-500">{{ status?.host?.display_name || user?.user_metadata?.display_name || user?.email }}</p></div></div>
      <div class="flex gap-2"><NuxtLink v-if="status?.host?.role==='superadmin'" to="/admin" class="neon-btn-cyan">Super Admin</NuxtLink><button class="neon-btn-ghost" @click="signOut">Sign Out</button></div>
    </header>

    <div v-if="error" class="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{{ error }}</div>

    <div class="mt-7 grid gap-5 lg:grid-cols-2">
      <section class="neon-card-cyan p-6">
        <div class="flex items-start justify-between gap-4"><div><div class="neon-kicker">Spotify Premium</div><h2 class="mt-2 text-2xl font-black">Your Music Account</h2></div><div class="text-3xl">◉</div></div>
        <div v-if="status?.connected" class="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div class="text-sm text-slate-500">Connected account</div><div class="mt-1 text-lg font-black">{{ status.connection?.display_name || 'Spotify Host' }}</div><div class="mt-2 inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-green-400">Premium Connected</div></div><button class="neon-btn-cyan" @click="connectSpotify" :disabled="connecting">{{ connecting?'Connecting…':'Change Spotify' }}</button></div>
        <div v-else class="mt-6"><p class="text-slate-400">Connect your own Spotify Premium account. Its active player and queue will power your parties.</p><button @click="connectSpotify" :disabled="connecting" class="neon-btn-cyan mt-5">{{connecting?'Connecting…':'Connect Spotify'}}</button></div>
      </section>

      <section class="neon-card p-6">
        <div class="neon-kicker">Create a Party</div><h2 class="mt-2 text-2xl font-black">Start Something Loud</h2>
        <p v-if="!status?.connected" class="mt-4 text-slate-500">Connect Spotify first to start hosting.</p>
        <div v-else class="mt-5 space-y-4">
          <div><label class="mb-2 block text-sm font-bold text-slate-300">Party name</label><input v-model="name" class="neon-input" placeholder="Saturday Night Party"></div>
          <div><label class="mb-2 block text-sm font-bold text-slate-300">Maximum active requests per guest</label><input v-model.number="maxRequests" class="neon-input" min="1" max="10" type="number"></div>
          <div><label class="mb-2 block text-sm font-bold text-slate-300">Guest request mode</label><div class="grid gap-3 sm:grid-cols-2"><button type="button" @click="queueMode='automatic'" class="neon-mode" :class="queueMode==='automatic'?'active-auto':'inactive'"><div class="neon-cyan font-black">⚡ Automatic</div><div class="mt-1 text-sm text-slate-500">Requests go directly into Spotify.</div></button><button type="button" @click="queueMode='approval'" class="neon-mode" :class="queueMode==='approval'?'active-approval':'inactive'"><div class="neon-pink font-black">◎ Approval</div><div class="mt-1 text-sm text-slate-500">You approve each request.</div></button></div></div>
          <button :disabled="creating||!name.trim()" @click="createParty" class="neon-btn w-full">{{creating?'Creating…':'Start Party'}}</button>
        </div>
      </section>
    </div>

    <section class="mt-8">
      <div class="flex items-center justify-between"><div><div class="neon-kicker">History</div><h2 class="mt-1 text-2xl font-black">Your Parties</h2></div><span class="text-xs text-slate-600">Latest 20</span></div>
      <div class="mt-4 grid gap-3">
        <NuxtLink v-for="p in parties" :key="p.id" :to="`/host/${p.id}?code=${p.code}`" class="neon-track p-4 sm:p-5"><div class="min-w-0 flex-1"><div class="truncate text-lg font-black">{{p.name}}</div><div class="mt-1 text-sm text-slate-500">Code <span class="font-bold text-fuchsia-400">{{p.code}}</span> · {{p.queue_mode==='automatic'?'Automatic':'Approval'}}</div></div><span class="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider" :class="p.status==='active'?'border-green-500/30 bg-green-500/10 text-green-400':'border-white/10 bg-white/5 text-slate-500'">{{p.status}}</span></NuxtLink>
        <div v-if="status&&!parties.length" class="neon-card border-dashed p-10 text-center text-slate-600">You have not created a party yet.</div>
      </div>
    </section>
  </div>
</main>
</template>
