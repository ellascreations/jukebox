export function useHostApi() {
  const supabase = useSupabaseClient()

  async function authHeaders() {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      await navigateTo('/host/login')
      throw new Error('Host sign-in required')
    }
    return { Authorization: `Bearer ${token}` }
  }

  async function hostFetch<T = any>(url: string, options: any = {}) {
    const headers = await authHeaders()
    return await $fetch<T>(url, {
      ...options,
      headers: { ...(options.headers || {}), ...headers }
    })
  }

  return { authHeaders, hostFetch }
}
