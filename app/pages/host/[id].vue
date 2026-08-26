<script setup lang="ts">
definePageMeta({ middleware: 'host-auth' })
import QRCode from 'qrcode'

const route=useRoute()
const partyId=String(route.params.id)
const code=String(route.query.code||'')
const config=useRuntimeConfig()
const { hostFetch } = useHostApi()
const qr=ref('')
const playback=ref<any>(null)
const party=ref<any>(null)
const requests=ref<any[]>([])
const busy=ref<string|null>(null)
const error=ref('')

async function load(){
  if(code){
    try {
      const d:any=await $fetch(`/api/parties/${code}`)
      party.value=d.party
      requests.value=d.requests
    } catch {}
  }
  try{
    playback.value=await hostFetch('/api/host/playback',{query:{party_id:partyId}})
  }catch(e:any){
    if (e?.statusCode === 403) error.value = 'This party belongs to another host account.'
  }
}
async function sendToSpotify(r:any){busy.value=r.id; try{await hostFetch('/api/host/queue',{method:'POST',body:{party_id:partyId,request_id:r.id}}); await load()}finally{busy.value=null}}
async function skip(){await hostFetch('/api/host/skip',{method:'POST',body:{party_id:partyId}}); setTimeout(load,700)}
let timer:any
onMounted(async()=>{
  const url=`${String(config.public.appUrl).replace(/\/$/,'')}/party/${code}`
  qr.value=await QRCode.toDataURL(url,{width:360,margin:1})
  await load()
  timer=setInterval(load,3000)
})
onBeforeUnmount(()=>clearInterval(timer))
</script>
<template><main class="min-h-screen p-4 lg:p-8"><div class="mx-auto max-w-7xl">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div class="text-sm font-bold uppercase tracking-widest text-green-400">HOST MODE · {{code}}</div><div v-if="party" class="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-300">{{ party.queue_mode === 'automatic' ? 'Automatic queue' : 'Host approval' }}</div><h1 class="mt-1 text-4xl font-black">{{party?.name || 'Party Jukebox'}}</h1></div><NuxtLink to="/host" class="btn-secondary">Host Dashboard</NuxtLink></div>
  <div v-if="error" class="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{{ error }}</div>
  <div class="mt-7 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
    <section class="glass overflow-hidden rounded-3xl"><div class="grid min-h-[440px] md:grid-cols-[.8fr_1.2fr]"><div class="bg-black/30"><img v-if="playback?.item?.image" :src="playback.item.image" class="h-full min-h-[300px] w-full object-cover"><div v-else class="grid h-full min-h-[300px] place-items-center text-8xl text-slate-800">♫</div></div><div class="flex flex-col justify-between p-7"><div><div class="text-sm font-bold uppercase tracking-widest text-slate-500">Now Playing</div><h2 class="mt-3 text-4xl font-black">{{playback?.item?.name || 'Start Spotify playback'}}</h2><p class="mt-2 text-xl text-slate-400">{{playback?.item?.artist || 'Choose a Spotify Connect device'}}</p><p v-if="playback?.device" class="mt-5 text-sm text-slate-500">Playing on {{playback.device.name}}</p></div><button @click="skip" class="btn-primary mt-8 self-start">Skip Track →</button></div></div></section>
    <aside class="glass rounded-3xl p-6 text-center"><h2 class="text-2xl font-black">Request a Song</h2><p class="mt-2 text-slate-400">Scan with your phone</p><img v-if="qr" :src="qr" class="mx-auto mt-5 w-full max-w-[300px] rounded-2xl bg-white p-3"><div class="mt-5 text-4xl font-black tracking-[.25em] text-green-400">{{code}}</div></aside>
  </div>
  <section class="mt-6"><div class="flex items-center justify-between"><h2 class="text-2xl font-black">Guest Queue</h2><span class="text-sm text-slate-500">Highest votes first</span></div><div class="mt-4 grid gap-3"><div v-for="r in requests" :key="r.id" class="glass flex items-center gap-4 rounded-2xl p-3"><div class="w-10 text-center text-xl font-black text-slate-500">{{r.votes}}</div><img v-if="r.image_url" :src="r.image_url" class="h-16 w-16 rounded-xl object-cover"><div class="min-w-0 flex-1"><div class="truncate font-bold">{{r.track_name}}</div><div class="truncate text-sm text-slate-400">{{r.artist_name}} · requested by {{r.requested_by}}</div></div><span v-if="r.status==='playing'" class="rounded-full bg-cyan-500/15 px-3 py-2 text-sm font-bold text-cyan-300">Now Playing</span><span v-else-if="r.status==='sent_to_spotify'" class="rounded-full bg-green-500/15 px-3 py-2 text-sm font-bold text-green-400">Queued in Spotify</span><button v-else-if="party?.queue_mode !== 'automatic'" @click="sendToSpotify(r)" :disabled="busy===r.id" class="btn-primary whitespace-nowrap">{{busy===r.id?'Adding…':'Add Next'}}</button><button v-else @click="sendToSpotify(r)" :disabled="busy===r.id" class="btn-secondary whitespace-nowrap">{{busy===r.id?'Retrying…':'Retry Spotify'}}</button></div><div v-if="!requests.length" class="rounded-3xl border border-dashed border-white/10 p-12 text-center text-slate-500">Guest requests will appear here.</div></div></section>
</div></main></template>
