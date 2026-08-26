<script setup lang="ts">
const supabase = useSupabaseClient()
const route = useRoute()
const message = ref('Confirming your account…')

onMounted(async () => {
  const code = String(route.query.code || '')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      message.value = error.message
      return
    }
  }

  const { data } = await supabase.auth.getSession()
  if (data.session) return navigateTo('/host')
  message.value = 'Email confirmed. You can now sign in.'
})
</script>

<template><main class="min-h-screen grid place-items-center px-4"><div class="glass max-w-md rounded-3xl p-8 text-center"><h1 class="text-2xl font-black">Host Account</h1><p class="mt-3 text-slate-400">{{ message }}</p><NuxtLink to="/host/login" class="btn-primary mt-6 inline-block">Sign In</NuxtLink></div></main></template>
