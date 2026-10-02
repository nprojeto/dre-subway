<script setup lang="ts">
definePageMeta({ layout: false })
const app = useApp()
const { f } = useFilters()
const term = ref('')
const brand = computed(() => app.data.value.settings?.app ?? {})

const norm = (s: any) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const stores = computed(() => {
  const t = norm(term.value)
  return app.data.value.stores
    .filter((s) => s.active && (!t || norm(`${s.name} ${s.code} ${s.city}`).includes(t)))
    .sort((a, b) => a.name.localeCompare(b.name))
})
const showAll = computed(() => app.data.value.stores.filter((s) => s.active).length > 1)
const firstName = computed(() => String(app.data.value.profile?.name ?? '').split(' ')[0])

function choose(ids: string[]) {
  f.value.stores = ids
  f.value.accounts = []
  try { sessionStorage.setItem('loja-ok', '1') } catch {}
  navigateTo('/')
}
async function logout() {
  try { sessionStorage.removeItem('loja-ok') } catch {}
  await useSupabase()?.auth.signOut()
  app.reset()
  navigateTo('/login')
}
</script>

<template>
  <div class="sel">
    <header class="sel-head">
      <LogoRotator :extra="brand.logo" :height="52" class="sel-logo" />
      <button class="link" @click="logout">Sair</button>
    </header>

    <main class="sel-main">
      <h1>Olá, {{ firstName }}!</h1>
      <p class="muted">Em qual loja você vai operar agora? Você pode trocar a qualquer momento pelo menu.</p>

      <input v-if="app.data.value.stores.length > 6" v-model="term" placeholder="Buscar loja por nome, código ou cidade" class="sel-search">

      <div class="sel-grid">
        <button v-if="showAll && !term" class="sel-card all" @click="choose([])">
          <strong>Todas as minhas lojas</strong>
          <span>Visão consolidada de {{ app.data.value.stores.filter((s) => s.active).length }} lojas</span>
        </button>
        <button v-for="s in stores.slice(0, 120)" :key="s.id" class="sel-card" @click="choose([s.id])">
          <small v-if="s.code">{{ s.code }}</small>
          <strong>{{ s.name }}</strong>
          <span>{{ [s.city, s.state].filter(Boolean).join(' - ') || '&nbsp;' }}</span>
          <span v-if="app.data.value.isAdmin && s.company_id" class="sel-co">{{ app.companyMap.value[s.company_id]?.name }}</span>
        </button>
      </div>
      <p v-if="stores.length > 120" class="muted small">Mostrando 120 de {{ stores.length }}. Use a busca.</p>
      <div v-if="!app.data.value.stores.length" class="card empty">
        <h3>Nenhuma loja liberada</h3>
        <p v-if="app.data.value.isManager"><NuxtLink to="/cadastros?tab=lojas">Cadastrar a primeira loja</NuxtLink></p>
        <p v-else>Peça ao responsável para liberar suas lojas.</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.sel { min-height: 100vh; background: var(--bg); }
.sel-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px; background: #fff; box-shadow: var(--shadow); }
.sel-logo { max-width: 220px; }
.sel-main { max-width: 1100px; margin: 0 auto; padding: 40px 24px; }
.sel-main h1 { font-size: 40px; color: var(--green-dark); }
.sel-main > p { margin: 6px 0 24px; }
.sel-search { max-width: 420px; margin-bottom: 20px; }
.sel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
.sel-card { text-align: left; background: #fff; border: 2px solid transparent; border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow); cursor: pointer; display: flex; flex-direction: column; gap: 4px; font: inherit; color: var(--ink); transition: border-color .15s, transform .1s; border-left: 6px solid var(--green); }
.sel-card:hover { border-color: var(--green); transform: translateY(-2px); }
.sel-card strong { font-family: var(--display); font-size: 22px; line-height: 1.1; }
.sel-card small { color: var(--muted); font-weight: 600; letter-spacing: .5px; }
.sel-card span { color: var(--muted); font-size: 14px; }
.sel-card .sel-co { color: var(--green); font-weight: 600; font-size: 13px; }
.sel-card.all { background: var(--green-dark); color: #fff; border-left-color: var(--yellow); }
.sel-card.all span { color: rgba(255,255,255,.75); }
</style>
