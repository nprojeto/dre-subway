export default defineNuxtRouteMiddleware(async (to) => {
  const sb = useSupabase()
  if (!sb) return
  const { data } = await sb.auth.getSession()
  if (!data.session) return to.path === '/login' ? undefined : navigateTo('/login')
  if (to.path === '/login') return navigateTo('/')
  const app = useApp()
  if (!app.data.value.loaded) {
    try { await app.load() } catch (e: any) { useToast().bad(e) }
  }
})
