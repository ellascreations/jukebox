export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const supabase = useSupabaseClient()
  const { data } = await supabase.auth.getSession()
  if (!data.session) return navigateTo('/host/login')
})
