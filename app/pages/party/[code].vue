<script setup lang="ts">
const route=useRoute(); const code=String(route.params.code).toUpperCase()
const guestToken=useCookie<string|null>(`party_guest_${code}`,{maxAge:60*60*24})
const guestName=ref(''); const joined=ref(!!guestToken.value); const query=ref(''); const tracks=ref<any[]>([]); const searching=ref(false); const message=ref('');
const {data,refresh}=await useFetch(`/api/parties/${code}`)
let timer:any
onMounted(()=>{ timer=setInterval(()=>refresh(),3000) }); onBeforeUnmount(()=>clearInterval(timer))
async function join(){ const g:any=await $fetch('/api/parties/join',{method:'POST',body:{code,display_name:guestName.value}}); guestToken.value=g.guest_token; joined.value=true }
async function search(){ if(query.value.trim().length<2)return; searching.value=true; try{ const r:any=await $fetch('/api/spotify/search',{query:{q:query.value,code}}); tracks.value=r.tracks }finally{searching.value=false} }
async function request(track:any){ message.value=''; try{await $fetch('/api/parties/request',{method:'POST',body:{guest_token:guestToken.value,track}}); message.value=`Added ${track.name}`; await refresh()}catch(e:any){message.value=e?.data?.statusMessage||'Could not add request'} }
async function vote(id:string){ try{await $fetch('/api/parties/vote',{method:'POST',body:{guest_token:guestToken.value,request_id:id}}); await refresh()}catch{} }
</script>
<template><main class="min-h-screen px-4 py-8"><div class="mx-auto max-w-3xl">
  <div v-if="data?.party"><div class="text-sm font-bold uppercase tracking-widest text-green-400">{{data.party.code}}</div><h1 class="mt-1 text-4xl font-black">{{data.party.name}}</h1><p class="mt-2 text-slate-400">Request a song and vote for the party favourites.</p></div>
  <div v-if="!joined" class="glass mt-8 rounded-3xl p-6"><h2 class="text-2xl font-bold">Join the party</h2><p class="mt-2 text-slate-400">Choose a name so everyone can see who requested each track.</p><input v-model="guestName" @keyup.enter="join" class="input mt-5" maxlength="40" placeholder="Your name"><button @click="join" :disabled="!guestName.trim()" class="btn-primary mt-3 w-full">Join</button></div>
  <template v-else>
    <div class="glass mt-8 rounded-3xl p-5"><div class="flex gap-2"><input v-model="query" @keyup.enter="search" class="input" placeholder="Search Spotify"><button @click="search" class="btn-primary">{{searching?'…':'Search'}}</button></div><div v-if="message" class="mt-3 text-sm text-green-300">{{message}}</div>
      <div class="mt-5 space-y-2"><div v-for="t in tracks" :key="t.id" class="flex items-center gap-3 rounded-2xl bg-white/5 p-3"><img v-if="t.image" :src="t.image" class="h-14 w-14 rounded-lg object-cover"><div class="min-w-0 flex-1"><div class="truncate font-bold">{{t.name}}</div><div class="truncate text-sm text-slate-400">{{t.artist}}</div></div><button @click="request(t)" class="btn-secondary whitespace-nowrap">+ Request</button></div></div>
    </div>
    <div class="mt-8"><h2 class="text-2xl font-black">Up Next</h2><div class="mt-4 space-y-3"><div v-for="r in data?.requests" :key="r.id" class="glass flex items-center gap-3 rounded-2xl p-3"><img v-if="r.image_url" :src="r.image_url" class="h-16 w-16 rounded-xl object-cover"><div class="min-w-0 flex-1"><div class="truncate font-bold">{{r.track_name}}</div><div class="truncate text-sm text-slate-400">{{r.artist_name}}</div><div class="mt-1 text-xs text-slate-500">Requested by {{r.requested_by}}</div></div><button @click="vote(r.id)" class="rounded-xl bg-white/5 px-3 py-2 font-bold hover:bg-white/10">👍 {{r.votes}}</button></div><div v-if="!data?.requests?.length" class="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">No requests yet. Be the first.</div></div></div>
  </template>
</div></main></template>
