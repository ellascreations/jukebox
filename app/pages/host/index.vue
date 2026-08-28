<script setup lang="ts">
definePageMeta({ middleware: 'host-auth' })
const supabase = useSupabaseClient(); const user = useSupabaseUser(); const { hostFetch } = useHostApi()
const status=ref<any>(null); const parties=ref<any[]>([]); const name=ref(''); const maxRequests=ref(3); const queueMode=ref<'automatic'|'approval'>('automatic'); const startsAt=ref(''); const finishesAt=ref('')
const creating=ref(false); const connecting=ref(false); const requestingSpotifyAccess=ref(false); const spotifyAccessEmail=ref(''); const error=ref(''); const route=useRoute()

const editingParty=ref<any>(null)
const editName=ref('')
const editMaxRequests=ref(3)
const editQueueMode=ref<'automatic'|'approval'>('automatic')
const editStartsAt=ref('')
const editFinishesAt=ref('')
const savingParty=ref(false)
const deletingPartyId=ref('')

function toLocalDateTimeInput(value:any){
  if(!value) return ''
  const d=new Date(value)
  if(Number.isNaN(d.getTime())) return ''
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000)
  return local.toISOString().slice(0,16)
}

function openEditParty(p:any){
  editingParty.value=p
  editName.value=p.name||''
  editMaxRequests.value=Number(p.max_requests_per_guest||3)
  editQueueMode.value=p.queue_mode==='automatic'?'automatic':'approval'
  editStartsAt.value=toLocalDateTimeInput(p.starts_at)
  editFinishesAt.value=toLocalDateTimeInput(p.finishes_at)
  error.value=''
}

function closeEditParty(){
  if(!savingParty.value) editingParty.value=null
}

async function saveParty(){
  if(!editingParty.value) return
  savingParty.value=true
  error.value=''
  try{
    const result:any=await hostFetch('/api/host/party.update',{
      method:'POST',
      body:{
        party_id:editingParty.value.id,
        name:editName.value,
        max_requests_per_guest:editMaxRequests.value,
        queue_mode:editQueueMode.value,
        starts_at:new Date(editStartsAt.value).toISOString(),
        finishes_at:new Date(editFinishesAt.value).toISOString()
      }
    })
    editingParty.value=null
    await load()
    if(result?.reused && result?.code_changed){
      error.value=`Party reused successfully. A new party code has been generated: ${result.party.code}`
    }
  }catch(e:any){
    error.value=e?.data?.statusMessage||e?.message||'Could not update party'
  }finally{
    savingParty.value=false
  }
}

async function deleteParty(p:any){
  if(!confirm(`Delete "${p.name}" permanently?\n\nThis will remove the party, guests, requests, votes and history for this party. This cannot be undone.`)) return
  deletingPartyId.value=p.id
  error.value=''
  try{
    await hostFetch(`/api/host/party?party_id=${encodeURIComponent(p.id)}`,{method:'DELETE'})
    if(editingParty.value?.id===p.id) editingParty.value=null
    await load()
  }catch(e:any){
    error.value=e?.data?.statusMessage||e?.message||'Could not delete party'
  }finally{
    deletingPartyId.value=''
  }
}
async function load(){try{status.value=await hostFetch('/api/host/status'); spotifyAccessEmail.value=status.value?.spotifyAccess?.spotify_email||user.value?.email||''; const data:any=await hostFetch('/api/host/parties'); parties.value=data.parties||[]}catch(e:any){if(e?.statusCode!==401) error.value=e?.data?.statusMessage||e?.message||'Could not load host account'}}
async function connectSpotify(){connecting.value=true; error.value=''; try{const result:any=await hostFetch('/api/spotify/login'); window.location.assign(result.url)}catch(e:any){error.value=e?.data?.statusMessage||e?.message||'Could not start Spotify connection'; connecting.value=false}}
async function requestSpotifyAccess(){requestingSpotifyAccess.value=true; error.value=''; try{await hostFetch('/api/host/spotify-access',{method:'POST',body:{spotify_email:spotifyAccessEmail.value}}); await load()}catch(e:any){error.value=e?.data?.statusMessage||e?.message||'Could not request Spotify access'}finally{requestingSpotifyAccess.value=false}}
async function createParty(){creating.value=true; error.value=''; try{const p:any=await hostFetch('/api/parties/create',{method:'POST',body:{name:name.value,max_requests_per_guest:maxRequests.value,queue_mode:queueMode.value,starts_at:new Date(startsAt.value).toISOString(),finishes_at:new Date(finishesAt.value).toISOString()}}); await navigateTo(`/host/${p.id}?code=${p.code}`)}catch(e:any){error.value=e?.data?.statusMessage||e?.message||'Could not create party'}finally{creating.value=false}}
async function signOut(){await supabase.auth.signOut(); await navigateTo('/')}
onMounted(async()=>{
  const spotifyResult = String(route.query.spotify || '')
  if (spotifyResult === 'connected') error.value = ''
  if (spotifyResult === 'not-premium') error.value = 'That Spotify account is not Premium. Please connect a Spotify Premium account.'
  if (spotifyResult === 'forbidden') error.value = 'Spotify connected, but Spotify returned 403 Forbidden. If this app is in Development Mode, add this Spotify account under Spotify Developer Dashboard → Users Management, then connect again.'
  if (spotifyResult === 'state-error') error.value = 'Spotify connection could not be verified because the OAuth session/state cookie was missing or expired. Please click Connect Spotify again.'
  if (spotifyResult === 'token-error') {
    const detail = route.query.reason ? ` (${String(route.query.reason)})` : ''
    error.value = `Spotify rejected the OAuth token exchange${detail}. Check that NUXT_SPOTIFY_REDIRECT_URI exactly matches the Redirect URI configured in the Spotify Developer Dashboard.`
  }
  if (spotifyResult === 'profile-error') error.value = 'Spotify login completed, but KC Jukebox could not read the Spotify account profile. Please try connecting again.'
  if (spotifyResult === 'save-error') error.value = 'Spotify login succeeded, but KC Jukebox could not save the Spotify connection. Please contact the administrator.'
  if (spotifyResult === 'denied') error.value = 'Spotify access was cancelled or denied.'
  await load()
})
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
        <div v-else class="mt-6">
          <div v-if="status?.spotifyAccess?.status==='approved'">
            <p class="text-slate-400">Spotify host access is approved. Connect the Spotify Premium account approved by the KC Jukebox administrator.</p>
            <div class="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">Approved for {{ status.spotifyAccess.spotify_email }}</div>
            <button @click="connectSpotify" :disabled="connecting" class="neon-btn-cyan mt-5">{{connecting?'Connecting…':'Connect Spotify'}}</button>
          </div>
          <div v-else-if="status?.spotifyAccess?.status==='pending'">
            <div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"><div class="font-black text-amber-300">Spotify Access Pending</div><p class="mt-2 text-sm text-slate-400">Your request for <span class="font-bold text-white">{{ status.spotifyAccess.spotify_email }}</span> is waiting for Super Admin approval.</p></div>
          </div>
          <div v-else>
            <p class="text-slate-400">KC Jukebox currently uses Spotify Development Mode. Request access for the email address used by your Spotify account before connecting.</p>
            <label class="mb-2 mt-4 block text-sm font-bold text-slate-300">Spotify account email</label>
            <input v-model="spotifyAccessEmail" type="email" class="neon-input" placeholder="you@example.com">
            <button @click="requestSpotifyAccess" :disabled="requestingSpotifyAccess||!spotifyAccessEmail.trim()" class="neon-btn-cyan mt-4">{{requestingSpotifyAccess?'Sending…':'Request Spotify Access'}}</button>
            <p v-if="status?.spotifyAccess?.status==='denied'" class="mt-3 text-sm text-red-300">Your previous request was denied. You can submit a new request with the correct Spotify email.</p>
          </div>
        </div>
      </section>

      <section class="neon-card p-6">
        <div class="neon-kicker">Create a Party</div><h2 class="mt-2 text-2xl font-black">Start Something Loud</h2>
        <p v-if="!status?.connected" class="mt-4 text-slate-500">Connect Spotify first to start hosting.</p>
        <div v-else class="mt-5 space-y-4">
          <div><label class="mb-2 block text-sm font-bold text-slate-300">Party name</label><input v-model="name" class="neon-input" placeholder="Saturday Night Party"></div>
          <div><label class="mb-2 block text-sm font-bold text-slate-300">Maximum active requests per guest</label><input v-model.number="maxRequests" class="neon-input" min="1" max="10" type="number"></div><div class="grid gap-4 sm:grid-cols-2"><div><label class="mb-2 block text-sm font-bold text-slate-300">Party starts</label><input v-model="startsAt" class="neon-input" type="datetime-local"><p class="mt-1 text-xs text-slate-600">Activates 15 minutes before start.</p></div><div><label class="mb-2 block text-sm font-bold text-slate-300">Party finishes</label><input v-model="finishesAt" class="neon-input" type="datetime-local"><p class="mt-1 text-xs text-slate-600">Deactivates 1 hour after finish.</p></div></div>
          <div><label class="mb-2 block text-sm font-bold text-slate-300">Guest request mode</label><div class="grid gap-3 sm:grid-cols-2"><button type="button" @click="queueMode='automatic'" class="neon-mode" :class="queueMode==='automatic'?'active-auto':'inactive'"><div class="neon-cyan font-black">⚡ Automatic</div><div class="mt-1 text-sm text-slate-500">Requests go directly into Spotify.</div></button><button type="button" @click="queueMode='approval'" class="neon-mode" :class="queueMode==='approval'?'active-approval':'inactive'"><div class="neon-pink font-black">◎ Approval</div><div class="mt-1 text-sm text-slate-500">You approve each request.</div></button></div></div>
          <button :disabled="creating||!name.trim()||!startsAt||!finishesAt" @click="createParty" class="neon-btn w-full">{{creating?'Creating…':'Schedule Party'}}</button>
        </div>
      </section>
    </div>

    <section class="mt-8">
      <div class="flex items-center justify-between"><div><div class="neon-kicker">History</div><h2 class="mt-1 text-2xl font-black">Your Parties</h2></div><span class="text-xs text-slate-600">Latest 20</span></div>
      <div class="mt-4 grid gap-3">
        <div v-for="p in parties" :key="p.id" class="neon-track flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <div class="truncate text-lg font-black">{{p.name}}</div>
              <span class="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider"
                :class="p.status==='active'
                  ?'border-green-500/30 bg-green-500/10 text-green-400'
                  :p.status==='scheduled'
                    ?'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                    :'border-white/10 bg-white/5 text-slate-500'">
                {{p.status}}
              </span>
            </div>
            <div class="mt-1 text-sm text-slate-500">
              Code <span class="font-bold text-fuchsia-400">{{p.code}}</span>
              · {{p.queue_mode==='automatic'?'Automatic':'Approval'}}
            </div>
            <div v-if="p.starts_at && p.finishes_at" class="mt-1 text-xs text-slate-600">
              {{new Date(p.starts_at).toLocaleString()}} → {{new Date(p.finishes_at).toLocaleString()}}
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <NuxtLink :to="`/host/${p.id}?code=${p.code}`" class="neon-btn-ghost">Open</NuxtLink>
            <button type="button" class="neon-btn-cyan" @click="openEditParty(p)">
              {{p.status==='ended'?'Edit / Reuse':'Edit'}}
            </button>
            <button
              type="button"
              class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
              :disabled="deletingPartyId===p.id"
              @click="deleteParty(p)"
            >
              {{deletingPartyId===p.id?'Deleting…':'Delete'}}
            </button>
          </div>
        </div>
        <div v-if="status&&!parties.length" class="neon-card border-dashed p-10 text-center text-slate-600">You have not created a party yet.</div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="editingParty" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" @click.self="closeEditParty">
        <section class="neon-card w-full max-w-2xl p-6 sm:p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="neon-kicker">{{editingParty.status==='ended'?'Reuse Party':'Edit Party'}}</div>
              <h2 class="mt-2 text-2xl font-black text-white">{{editingParty.name}}</h2>
              <p v-if="editingParty.status==='ended'" class="mt-2 text-sm text-cyan-300">
                Give this party new dates to reuse it. KC Jukebox will generate a fresh party code and invalidate old guest sessions.
              </p>
            </div>
            <button type="button" class="neon-btn-ghost" @click="closeEditParty">✕</button>
          </div>

          <div class="mt-6 space-y-4">
            <div>
              <label class="mb-2 block text-sm font-bold text-slate-300">Party name</label>
              <input v-model="editName" class="neon-input">
            </div>

            <div>
              <label class="mb-2 block text-sm font-bold text-slate-300">Maximum active requests per guest</label>
              <input v-model.number="editMaxRequests" class="neon-input" min="1" max="10" type="number">
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-2 block text-sm font-bold text-slate-300">Party starts</label>
                <input v-model="editStartsAt" class="neon-input" type="datetime-local">
                <p class="mt-1 text-xs text-slate-600">Activates 15 minutes before start.</p>
              </div>
              <div>
                <label class="mb-2 block text-sm font-bold text-slate-300">Party finishes</label>
                <input v-model="editFinishesAt" class="neon-input" type="datetime-local">
                <p class="mt-1 text-xs text-slate-600">Deactivates 1 hour after finish.</p>
              </div>
            </div>

            <div>
              <label class="mb-2 block text-sm font-bold text-slate-300">Guest request mode</label>
              <div class="grid gap-3 sm:grid-cols-2">
                <button type="button" @click="editQueueMode='automatic'" class="neon-mode" :class="editQueueMode==='automatic'?'active-auto':'inactive'">
                  <div class="neon-cyan font-black">⚡ Automatic</div>
                  <div class="mt-1 text-sm text-slate-500">Requests go directly into Spotify.</div>
                </button>
                <button type="button" @click="editQueueMode='approval'" class="neon-mode" :class="editQueueMode==='approval'?'active-approval':'inactive'">
                  <div class="neon-pink font-black">◎ Approval</div>
                  <div class="mt-1 text-sm text-slate-500">You approve each request.</div>
                </button>
              </div>
            </div>

            <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button type="button" class="neon-btn-ghost" @click="closeEditParty">Cancel</button>
              <button
                type="button"
                class="neon-btn"
                :disabled="savingParty||!editName.trim()||!editStartsAt||!editFinishesAt"
                @click="saveParty"
              >
                {{savingParty?'Saving…':editingParty.status==='ended'?'Save & Reuse Party':'Save Changes'}}
              </button>
            </div>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</main>
</template>
