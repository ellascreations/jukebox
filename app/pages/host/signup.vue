<script setup lang="ts">
const supabase = useSupabaseClient()
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const message = ref('')

async function signUp() {
  error.value = ''
  message.value = ''
  if (password.value.length < 8) return error.value = 'Password must be at least 8 characters.'
  if (password.value !== confirmPassword.value) return error.value = 'Passwords do not match.'

  loading.value = true
  const redirectTo = `${window.location.origin}/confirm`
  const { data, error: e } = await supabase.auth.signUp({
    email: email.value.trim(),
    password: password.value,
    options: {
      emailRedirectTo: redirectTo,
      data: { display_name: name.value.trim() }
    }
  })
  loading.value = false

  if (e) return error.value = e.message
  if (data.session) return navigateTo('/host')
  message.value = 'Account created. Check your email to confirm your address, then sign in.'
}
</script>

<template>
<main class="min-h-screen grid place-items-center px-4 py-12">
  <div class="w-full max-w-md">
    <NuxtLink to="/" class="text-sm text-slate-400 hover:text-white">← Party Jukebox</NuxtLink>
    <div class="glass mt-5 rounded-3xl p-7">
      <h1 class="text-3xl font-black">Create Host Account</h1>
      <p class="mt-2 text-slate-400">Each host can connect and use their own Spotify Premium account.</p>
      <form class="mt-7 space-y-4" @submit.prevent="signUp">
        <div><label class="mb-2 block text-sm font-bold">Display name</label><input v-model="name" class="input" required></div>
        <div><label class="mb-2 block text-sm font-bold">Email</label><input v-model="email" class="input" type="email" autocomplete="email" required></div>
        <div><label class="mb-2 block text-sm font-bold">Password</label><input v-model="password" class="input" type="password" autocomplete="new-password" required></div>
        <div><label class="mb-2 block text-sm font-bold">Confirm password</label><input v-model="confirmPassword" class="input" type="password" autocomplete="new-password" required></div>
        <div v-if="error" class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{{ error }}</div>
        <div v-if="message" class="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">{{ message }}</div>
        <button class="btn-primary w-full" :disabled="loading">{{ loading ? 'Creating…' : 'Create Host Account' }}</button>
      </form>
      <p class="mt-6 text-center text-sm text-slate-400">Already registered? <NuxtLink to="/host/login" class="font-bold text-green-400">Sign in</NuxtLink></p>
    </div>
  </div>
</main>
</template>
