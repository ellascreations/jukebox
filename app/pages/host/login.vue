<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

if (user.value) await navigateTo('/host')

async function signIn() {
  loading.value = true
  error.value = ''
  const { error: e } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value })
  loading.value = false
  if (e) return error.value = e.message
  await navigateTo('/host')
}
</script>

<template>
<main class="min-h-screen grid place-items-center px-4 py-12">
  <div class="w-full max-w-md">
    <NuxtLink to="/" class="text-sm text-slate-400 hover:text-white">← Party Jukebox</NuxtLink>
    <div class="glass mt-5 rounded-3xl p-7">
      <h1 class="text-3xl font-black">Host Sign In</h1>
      <p class="mt-2 text-slate-400">Sign in to manage your parties and your Spotify connection.</p>
      <form class="mt-7 space-y-4" @submit.prevent="signIn">
        <div><label class="mb-2 block text-sm font-bold">Email</label><input v-model="email" class="input" type="email" autocomplete="email" required></div>
        <div><label class="mb-2 block text-sm font-bold">Password</label><input v-model="password" class="input" type="password" autocomplete="current-password" required></div>
        <div v-if="error" class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{{ error }}</div>
        <button class="btn-primary w-full" :disabled="loading">{{ loading ? 'Signing in…' : 'Sign In' }}</button>
      </form>
      <p class="mt-6 text-center text-sm text-slate-400">Need a host account? <NuxtLink to="/host/signup" class="font-bold text-green-400">Sign up</NuxtLink></p>
    </div>
  </div>
</main>
</template>
