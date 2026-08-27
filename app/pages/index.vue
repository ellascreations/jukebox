<script setup lang="ts">
const code = ref('')
const user = useSupabaseUser()
function join(){ if(code.value.trim()) navigateTo(`/party/${code.value.trim().toUpperCase()}`) }
</script>
<template>
  <main class="neon-page grid place-items-center px-4 py-10">
    <div class="w-full max-w-4xl text-center">
      <img src="/kc-jukebox-logo.png" alt="KC Jukebox" class="neon-logo max-w-[300px]" />
      <p class="neon-kicker mt-4">Play it. Love it. Party to it.</p>
      <h1 class="neon-title mt-4 text-4xl sm:text-6xl">Your party. Their requests. Your Spotify.</h1>
      <p class="mx-auto mt-5 max-w-2xl text-lg text-slate-400">Create a party, display the QR code and let guests request and vote from their phones.</p>

      <div class="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
        <NuxtLink :to="user ? '/host' : '/host/signup'" class="neon-btn">{{ user ? 'Host Dashboard' : 'Become a Host' }}</NuxtLink>
        <NuxtLink v-if="!user" to="/host/login" class="neon-btn-cyan">Host Sign In</NuxtLink>
      </div>

      <section class="neon-card mx-auto mt-10 max-w-xl p-6 text-left sm:p-8">
        <div class="text-center">
          <div class="neon-cyan text-sm font-black uppercase tracking-[.18em]">Join a Party</div>
          <p class="mt-2 text-sm text-slate-500">Enter the six-character code shown by your host.</p>
        </div>
        <div class="mt-6 flex flex-col gap-3 sm:flex-row">
          <input v-model="code" @keyup.enter="join" class="neon-input text-center uppercase tracking-[.18em] sm:text-left" maxlength="6" placeholder="PARTY CODE">
          <button @click="join" class="neon-btn whitespace-nowrap">Join Party</button>
        </div>
      </section><div class="mx-auto mt-7 max-w-2xl text-xs leading-5 text-slate-600"><strong class="text-slate-500">Private use only.</strong> KC Jukebox is intended for private, personal and non-commercial gatherings and does not grant public-performance or commercial music rights. <NuxtLink to="/terms" class="font-bold text-cyan-500">Terms of Use</NuxtLink></div>
    </div>
  </main>
</template>
