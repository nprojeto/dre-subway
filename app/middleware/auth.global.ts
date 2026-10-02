export default defineNuxtRouteMiddleware(async (to) => {
  const sb = useSupabase()
  if (!sb) return
  const { data } = await sb.auth.getSession()
  if (!data.session) return to.path === '/login' ? undefined : navigateTo('/login')
  if (to.path === '/login') return navigateTo('/')
  const app = useApp()
  if (!app.data.value.loaded) {
    try { await app.load() } catch (e: any) { useToast().bad(e); return }
  }

  // garante que o filtro só tenha lojas que este usuário pode ver
  const { f } = useFilters()
  const allowed = new Set(app.data.value.stores.map((s) => s.id))
  if (f.value.stores.some((id) => !allowed.has(id))) { f.value.stores = f.value.stores.filter((id) => allowed.has(id)); f.value.accounts = [] }

  // escolha da loja ao entrar
  if (to.path === '/selecionar-loja') return
  let chosen = false
  try { chosen = sessionStorage.getItem('loja-ok') === '1' } catch {}
  if (chosen) return
  const active = app.data.value.stores.filter((s) => s.active)
  if (active.length === 1) {
    f.value.stores = [active[0].id]
    f.value.accounts = []
    try { sessionStorage.setItem('loja-ok', '1') } catch {}
  } else if (active.length > 1) {
    return navigateTo('/selecionar-loja')
  }
})
