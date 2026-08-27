<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
if (user.value) await navigateTo('/host')
async function signIn() {
  loading.value = true; error.value = ''
  const { error: e } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value })
  loading.value = false
  if (e) return error.value = e.message
  await navigateTo('/host')
}
</script>
<template>
<main class="neon-page grid place-items-center px-4 py-10">
  <div class="w-full max-w-md">
    <NuxtLink to="/" class="block"><img src="/kc-jukebox-logo.png" alt="KC Jukebox" class="neon-logo max-w-[210px]" /></NuxtLink>
    <section class="neon-card mt-5 p-7 sm:p-8">
      <div class="text-center"><div class="neon-kicker">Host Access</div><h1 class="neon-title mt-2 text-3xl">Host Sign In</h1><p class="mt-2 text-sm text-slate-500">Manage your parties and Spotify Premium connection.</p></div>
      <form class="mt-7 space-y-4" @submit.prevent="signIn">
        <div><label class="mb-2 block text-sm font-bold text-slate-300">Email address</label><input v-model="email" class="neon-input" type="email" autocomplete="email" required></div>
        <div><div class="mb-2 flex items-center justify-between"><label class="text-sm font-bold text-slate-300">Password</label><NuxtLink to="/host/forgot-password" class="text-xs font-bold text-cyan-400">Forgot password?</NuxtLink></div><input v-model="password" class="neon-input" type="password" autocomplete="current-password" required></div>
        <div v-if="error" class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{{ error }}</div>
        <button class="neon-btn w-full" :disabled="loading">{{ loading ? 'Signing in…' : 'Sign In' }}</button>
      </form>
      <p class="mt-6 text-center text-sm text-slate-500">Need a host account? <NuxtLink to="/host/signup" class="font-bold text-fuchsia-400">Create one</NuxtLink></p>
    </section><p class="mt-5 text-center text-xs leading-5 text-slate-600">Private, personal and non-commercial use only. <NuxtLink to="/terms" class="font-bold text-cyan-500">Terms of Use</NuxtLink></p>
  </div>
</main>
</template>
