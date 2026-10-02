<script setup lang="ts">
const app = useApp()
const route = useRoute()
const menuOpen = ref(false)
watch(() => route.path, () => (menuOpen.value = false))

const nav = computed(() => {
  const d = app.data.value
  const items = [
    { to: '/', label: 'Painel', icon: 'dash' },
    { to: '/lancamentos', label: 'Lançamentos', icon: 'list' },
    { to: '/importar', label: 'Importar extrato', icon: 'upload', write: true },
    { to: '/fluxo', label: 'Fluxo de caixa', icon: 'flow' },
    { to: '/dre', label: 'DRE', icon: 'dre' },
    { to: '/conciliacao', label: 'Conciliação', icon: 'check' },
    { to: '/previsto', label: 'Previsto', icon: 'target' },
    { to: '/cadastros', label: 'Cadastros', icon: 'box' },
    { to: '/usuarios', label: 'Usuários', icon: 'users', manager: true },
    { to: '/parametros', label: 'Parâmetros', icon: 'gear', admin: true },
  ]
  return items.filter((i: any) => (!i.admin || d.isAdmin) && (!i.manager || d.isManager) && (!i.write || d.canWrite))
})

const brand = computed(() => app.data.value.settings?.app ?? {})
const roleLabel: Record<string, string> = { admin: 'Administrador geral', empresario: 'Empresário', gestor: 'Gestor', visualizador: 'Visualizador' }
const { f } = useFilters()
const currentStore = computed(() => {
  const n = f.value.stores.length
  if (n === 1) return app.storeMap.value[f.value.stores[0]]?.name ?? '1 loja'
  if (n > 1) return `${n} lojas selecionadas`
  return app.data.value.stores.length > 1 ? 'Todas as minhas lojas' : (app.data.value.stores[0]?.name ?? 'Nenhuma loja')
})

async function logout() {
  try { sessionStorage.removeItem('loja-ok') } catch {}
  await useSupabase()?.auth.signOut()
  app.reset()
  navigateTo('/login')
}
</script>

<template>
  <div class="shell">
    <aside class="side" :class="{ open: menuOpen }">
      <div class="brand">
        <div class="brand-card"><LogoRotator :extra="brand.logo" :height="40" /></div>
        <strong>{{ brand.name || 'DRE SUBWAY' }}</strong>
      </div>
      <NuxtLink to="/selecionar-loja" class="store-sw" title="Trocar de loja">
        <small>Operando em</small>
        <strong>{{ currentStore }}</strong>
        <span>Trocar</span>
      </NuxtLink>
      <nav>
        <NuxtLink v-for="i in nav" :key="i.to" :to="i.to" class="nav-i" :class="{ on: route.path === i.to }">
          <Icon :name="i.icon" /> {{ i.label }}
        </NuxtLink>
      </nav>
      <div class="me">
        <div>
          <strong>{{ app.data.value.profile?.name }}</strong>
          <small>{{ roleLabel[app.data.value.profile?.role] }}</small>
        </div>
        <button class="btn icon me-out" title="Sair" aria-label="Sair" @click="logout"><Icon name="out" size="18" /></button>
      </div>
    </aside>
    <div v-if="menuOpen" class="scrim" @click="menuOpen = false" />
    <main class="main">
      <button class="btn ghost icon burger" aria-label="Abrir menu" @click="menuOpen = true"><Icon name="menu" /></button>
      <div v-if="!app.data.value.loaded" class="loading-box"><span class="spinner" /> Carregando...</div>
      <slot v-else />
    </main>
  </div>
</template>

<style scoped>
.shell { display: flex; min-height: 100vh; }
.side { width: 248px; flex: none; background: var(--green-dark); color: #fff; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; padding: 16px 12px; overflow-y: auto; }
.brand { padding: 0 4px 12px; }
.brand-card { background: #fff; border-radius: 12px; padding: 8px 12px; margin-bottom: 10px; }
.brand strong { display: block; font-family: var(--display); font-size: 22px; line-height: 1.1; letter-spacing: .5px; }
.brand small { color: rgba(255,255,255,.65); font-size: 12.5px; line-height: 1.3; display: block; margin-top: 2px; }
nav { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.store-sw { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 0 8px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); border-radius: 12px; padding: 9px 12px; margin: 0 0 12px; color: #fff; }
.store-sw:hover { background: rgba(255,255,255,.14); }
.store-sw small { grid-column: 1; color: rgba(255,255,255,.6); font-size: 11.5px; }
.store-sw strong { grid-column: 1; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.store-sw span { grid-column: 2; grid-row: 1 / 3; font-size: 12.5px; font-weight: 700; color: var(--green-dark); background: var(--yellow); padding: 4px 10px; border-radius: 99px; }
.nav-i { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 10px; color: rgba(255,255,255,.78); font-weight: 500; position: relative; }
.nav-i:hover { background: rgba(255,255,255,.07); color: #fff; }
.nav-i.on { background: rgba(255,255,255,.1); color: #fff; font-weight: 600; }
.nav-i.on::before { content: ''; position: absolute; left: -12px; top: 8px; bottom: 8px; width: 5px; border-radius: 0 5px 5px 0; background: var(--yellow); }
.me { display: flex; align-items: center; gap: 10px; border-top: 1px solid rgba(255,255,255,.12); padding: 14px 8px 0; }
.me > div { flex: 1; min-width: 0; }
.me strong { display: block; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.me small { color: rgba(255,255,255,.6); font-size: 12px; }
.me-out { background: rgba(255,255,255,.1); }
.main { flex: 1; min-width: 0; padding: 26px 30px 60px; }
.burger { display: none; margin-bottom: 12px; }
.scrim { display: none; }
@media (max-width: 900px) {
  .side { position: fixed; left: 0; z-index: 60; transform: translateX(-100%); transition: transform .2s; }
  .side.open { transform: none; }
  .scrim { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 55; }
  .burger { display: inline-flex; }
  .main { padding: 16px 14px 60px; }
}
</style>
