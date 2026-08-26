<script setup lang="ts">
const route=useRoute(); const code=String(route.params.code).toUpperCase()
const guestToken=useCookie<string|null>(`party_guest_${code}`,{maxAge:60*60*24})
const guestName=ref(''); const joined=ref(!!guestToken.value); const query=ref(''); const tracks=ref<any[]>([]); const searching=ref(false); const message=ref('')
const {data,refresh}=await useFetch(`/api/parties/${code}`)
let timer:any; onMounted(()=>{timer=setInterval(()=>refresh(),3000)}); onBeforeUnmount(()=>clearInterval(timer))
async function join(){const g:any=await $fetch('/api/parties/join',{method:'POST',body:{code,display_name:guestName.value}}); guestToken.value=g.guest_token; joined.value=true}
async function search(){if(query.value.trim().length<2)return; searching.value=true; try{const r:any=await $fetch('/api/spotify/search',{query:{q:query.value,code}}); tracks.value=r.tracks}finally{searching.value=false}}
async function request(track:any){message.value=''; try{await $fetch('/api/parties/request',{method:'POST',body:{guest_token:guestToken.value,track}}); message.value=`Added ${track.name}`; await refresh()}catch(e:any){message.value=e?.data?.statusMessage||'Could not add request'}}
async function vote(id:string){try{await $fetch('/api/parties/vote',{method:'POST',body:{guest_token:guestToken.value,request_id:id}}); await refresh()}catch{}}
</script>
<template>
<main class="neon-page min-h-screen">
  <div class="mx-auto max-w-3xl px-4 py-6 sm:py-8">
    <header class="text-center"><img src="/kc-jukebox-logo.png" alt="KC Jukebox" class="neon-logo max-w-[200px]"><div v-if="data?.party" class="mt-3"><div class="neon-kicker">Party Code</div><div class="neon-code mt-2">{{data.party.code}}</div><h1 class="mt-3 text-2xl font-black">{{data.party.name}}</h1><p class="mt-1 text-sm text-slate-500">Search, request and vote for what plays next.</p></div></header>

    <section v-if="!joined" class="neon-card mx-auto mt-7 max-w-lg p-6 sm:p-8"><div class="text-center"><div class="neon-cyan text-4xl">♫</div><h2 class="neon-title mt-3 text-2xl">Join the Party</h2><p class="mt-2 text-sm text-slate-500">Choose a name so everyone can see who requested each track.</p></div><input v-model="guestName" @keyup.enter="join" class="neon-input mt-6 text-center" maxlength="40" placeholder="Your name"><button @click="join" :disabled="!guestName.trim()" class="neon-btn mt-3 w-full">Join Party</button></section>

    <template v-else>
      <section class="neon-card mt-7 p-5 sm:p-6"><div class="neon-kicker text-fuchsia-400">Request a Song</div><div class="mt-4 flex flex-col gap-2 sm:flex-row"><input v-model="query" @keyup.enter="search" class="neon-input" placeholder="Search for a song or artist…"><button @click="search" class="neon-btn-cyan sm:w-auto">{{searching?'Searching…':'Search'}}</button></div><div v-if="message" class="mt-3 rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-300">{{message}}</div><div class="mt-5 space-y-2"><div v-for="t in tracks" :key="t.id" class="neon-track"><img v-if="t.image" :src="t.image" class="h-14 w-14 rounded-lg object-cover"><div class="min-w-0 flex-1"><div class="truncate font-black">{{t.name}}</div><div class="truncate text-sm text-slate-500">{{t.artist}}</div></div><button @click="request(t)" class="neon-btn px-4 py-2 text-sm">Request</button></div></div></section>

      <section class="mt-7"><div class="flex items-end justify-between"><div><div class="neon-kicker">Guest Queue</div><h2 class="mt-1 text-2xl font-black">Up Next</h2></div><div class="text-xs text-slate-600">Vote for favourites</div></div><div class="mt-4 space-y-3"><div v-for="r in data?.requests" :key="r.id" class="neon-track"><img v-if="r.image_url" :src="r.image_url" class="h-16 w-16 rounded-xl object-cover"><div class="min-w-0 flex-1"><div class="truncate font-black">{{r.track_name}}</div><div class="truncate text-sm text-slate-500">{{r.artist_name}}</div><div class="mt-1 text-xs text-slate-600">Requested by {{r.requested_by}}</div></div><button @click="vote(r.id)" class="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 font-black text-violet-300 transition hover:bg-violet-500/20">👍 {{r.votes}}</button></div><div v-if="!data?.requests?.length" class="neon-card border-dashed p-8 text-center text-slate-600">No requests yet. Be the first.</div></div></section>
    </template>
  </div>
  <nav v-if="joined" class="neon-bottom-nav"><div class="text-fuchsia-400">♫<br>Request</div><div>☷<br>Queue</div><div>◉<br>Party</div></nav>
</main>
</template>
