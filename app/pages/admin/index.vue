<script setup lang="ts">
definePageMeta({ middleware: 'host-auth' })
const { hostFetch } = useHostApi()
const supabase = useSupabaseClient()
const hosts = ref<any[]>([]); const loading = ref(true); const error = ref(''); const busy = ref('')
async function load(){ loading.value=true; error.value=''; try{const r:any=await hostFetch('/api/admin/overview'); hosts.value=r.hosts||[]}catch(e:any){error.value=e?.data?.statusMessage||e?.message||'Could not load Super Admin'}finally{loading.value=false}}
async function updateHost(h:any, patch:any){busy.value=h.user_id; error.value=''; try{await hostFetch('/api/admin/host',{method:'PATCH',body:{user_id:h.user_id,...patch}}); await load()}catch(e:any){error.value=e?.data?.statusMessage||e?.message||'Could not update host'}finally{busy.value=''}}
async function signOut(){await supabase.auth.signOut(); await navigateTo('/')}
onMounted(load)
</script>
<template><main class="neon-page"><div class="neon-shell">
<header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex items-center gap-4"><img src="/kc-jukebox-logo.png" class="w-24" alt="KC Jukebox"><div><div class="neon-kicker">System Control</div><h1 class="neon-title text-3xl">Super Admin</h1></div></div><div class="flex gap-2"><NuxtLink to="/host" class="neon-btn-ghost">Host Dashboard</NuxtLink><button class="neon-btn-ghost" @click="signOut">Sign Out</button></div></header>
<div v-if="error" class="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{{error}}</div>
<section class="neon-card mt-7 overflow-hidden"><div class="border-b border-white/10 p-5"><div class="neon-kicker">Accounts</div><h2 class="mt-1 text-2xl font-black">Registered Hosts</h2></div>
<div v-if="loading" class="p-8 text-slate-500">Loading hosts…</div><div v-else class="divide-y divide-white/10">
<div v-for="h in hosts" :key="h.user_id" class="grid gap-4 p-5 lg:grid-cols-[1.4fr_.8fr_.7fr_auto] lg:items-center">
<div><div class="font-black text-white">{{h.display_name||h.email}}</div><div class="text-sm text-slate-500">{{h.email}}</div><div class="mt-2 flex flex-wrap gap-2"><span class="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-[11px] font-black uppercase text-fuchsia-300">{{h.role}}</span><span :class="h.enabled?'text-green-400 border-green-500/30 bg-green-500/10':'text-red-300 border-red-500/30 bg-red-500/10'" class="rounded-full border px-2 py-1 text-[11px] font-black uppercase">{{h.enabled?'Enabled':'Disabled'}}</span></div></div>
<div class="text-sm"><div class="text-slate-500">Spotify</div><div class="font-bold" :class="h.spotify?'text-green-400':'text-slate-600'">{{h.spotify ? (h.spotify.display_name || 'Connected') : 'Not connected'}}</div></div>
<div class="text-sm"><div class="text-slate-500">Parties</div><div class="font-bold text-cyan-300">{{h.party_count}} total · {{h.active_party_count}} active</div></div>
<div class="flex flex-wrap gap-2 lg:justify-end"><button class="neon-btn-ghost text-sm" :disabled="busy===h.user_id" @click="updateHost(h,{enabled:!h.enabled})">{{h.enabled?'Disable':'Enable'}}</button><button class="neon-btn-cyan text-sm" :disabled="busy===h.user_id" @click="updateHost(h,{role:h.role==='superadmin'?'host':'superadmin'})">{{h.role==='superadmin'?'Make Host':'Make Super Admin'}}</button></div>
</div></div></section></div></main></template>
