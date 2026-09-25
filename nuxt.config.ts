// Configuração do Nuxt. Não precisa alterar.
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: false },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'Fluxo de Caixa',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#00391A' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&display=swap' },
        { rel: 'icon', href: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2224%22 fill=%22%23008C15%22/><path d=%22M28 62h44M28 44h30%22 stroke=%22%23FFC20E%22 stroke-width=%2212%22 stroke-linecap=%22round%22/></svg>' },
      ],
    },
  },
  router: { options: { hashMode: true } },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://jgnbswhywbfnnphactrk.supabase.co',
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnbmJzd2h5d2Jmbm5waGFjdHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjQwMDQsImV4cCI6MjEwNTk0MDAwNH0.8eJbs8_mKaKnvA4gkVJpxD5mBwVj9DM606SnkrmjF8g',
    },
  },
})
