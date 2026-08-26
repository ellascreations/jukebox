<script setup lang="ts">
const code = ref('')
function join(){ if(code.value.trim()) navigateTo(`/party/${code.value.trim().toUpperCase()}`) }
</script>
<template>
  <main class="min-h-screen grid place-items-center px-4 py-12 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,.16),_transparent_35%)]">
    <div class="w-full max-w-4xl text-center">
      <div class="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-green-500 text-4xl">♫</div>
      <h1 class="text-5xl font-black tracking-tight sm:text-7xl">Party Jukebox</h1>
      <p class="mx-auto mt-5 max-w-2xl text-lg text-slate-400">Host the music. Let your guests scan, search, request and vote for what plays next.</p>
      <div class="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <NuxtLink to="/host" class="btn-primary">Host a Party</NuxtLink>
      </div>
      <div class="glass mx-auto mt-12 max-w-xl rounded-3xl p-6 text-left">
        <label class="mb-2 block text-sm font-bold text-slate-300">Joining a party?</label>
        <div class="flex gap-3"><input v-model="code" @keyup.enter="join" class="input uppercase" maxlength="6" placeholder="PARTY CODE"><button @click="join" class="btn-secondary">Join</button></div>
      </div>
    </div>
  </main>
</template>
