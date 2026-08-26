<script setup lang="ts">
const { data: status, refresh } = await useFetch('/api/host/status')
const name = ref('')
const maxRequests = ref(3)
const creating = ref(false)
const error = ref('')
async function createParty(){
  creating.value=true; error.value=''
  try { const p:any = await $fetch('/api/parties/create',{method:'POST',body:{name:name.value,max_requests_per_guest:maxRequests.value}}); await navigateTo(`/host/${p.id}?code=${p.code}`) }
  catch(e:any){ error.value=e?.data?.statusMessage || e?.message || 'Could not create party' }
  finally{ creating.value=false }
}
</script>
<template>
<main class="min-h-screen px-4 py-10">
  <div class="mx-auto max-w-3xl">
    <NuxtLink to="/" class="text-sm text-slate-400 hover:text-white">← Party Jukebox</NuxtLink>
    <h1 class="mt-5 text-4xl font-black">Host a Party</h1>
    <p class="mt-2 text-slate-400">Connect the Spotify Premium account that will control the party music.</p>
    <div class="glass mt-8 rounded-3xl p-6">
      <div v-if="status?.connected" class="flex items-center justify-between gap-4"><div><div class="text-sm text-slate-400">Spotify connected</div><div class="font-bold">{{ status.connection?.display_name || 'Spotify Host' }}</div></div><span class="rounded-full bg-green-500/15 px-3 py-1 text-sm font-bold text-green-400">Connected</span></div>
      <div v-else><h2 class="text-xl font-bold">1. Connect Spotify</h2><p class="mt-2 text-slate-400">Playback controls need a Spotify Premium host account.</p><a href="/api/spotify/login" class="btn-primary mt-5 inline-block">Connect Spotify</a></div>
    </div>
    <div v-if="status?.connected" class="glass mt-5 rounded-3xl p-6">
      <h2 class="text-xl font-bold">2. Create your party</h2>
      <div class="mt-5 space-y-4"><div><label class="mb-2 block text-sm font-bold text-slate-300">Party name</label><input v-model="name" class="input" placeholder="Saturday Night Party"></div><div><label class="mb-2 block text-sm font-bold text-slate-300">Maximum active requests per guest</label><input v-model.number="maxRequests" class="input" min="1" max="10" type="number"></div><div v-if="error" class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">{{error}}</div><button :disabled="creating || !name.trim()" @click="createParty" class="btn-primary">{{ creating ? 'Creating…' : 'Start Party' }}</button></div>
    </div>
  </div>
</main>
</template>
