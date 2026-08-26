<script setup lang="ts">
const supabase=useSupabaseClient(); const route=useRoute(); const message=ref('Confirming your account…')
onMounted(async()=>{const code=String(route.query.code||''); if(code){const{error}=await supabase.auth.exchangeCodeForSession(code); if(error){message.value=error.message;return}} const{data}=await supabase.auth.getSession(); if(data.session)return navigateTo('/host'); message.value='Email confirmed. You can now sign in.'})
</script>
<template><main class="neon-page grid place-items-center px-4"><section class="neon-card w-full max-w-md p-8 text-center"><img src="/kc-jukebox-logo.png" class="neon-logo max-w-[190px]" alt="KC Jukebox"><div class="neon-kicker mt-5">Host Account</div><h1 class="neon-title mt-2 text-2xl">Account Confirmation</h1><p class="mt-3 text-slate-400">{{message}}</p><NuxtLink to="/host/login" class="neon-btn mt-6 inline-block">Sign In</NuxtLink></section></main></template>
