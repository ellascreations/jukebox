export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase'
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    spotifyClientId: '',
    spotifyClientSecret: '',
    spotifyRedirectUri: '',
    supabaseServiceRoleKey: '',
    supabaseUrl: '',

    public: {
      appUrl: ''
    }
  },

  supabase: {
    redirectOptions: {
      login: '/',
      callback: '/confirm',
      exclude: ['/*']
    }
  }
})
