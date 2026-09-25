<script setup lang="ts">
const app = useApp()
const api = useApi()
const toast = useToast()

const store = ref<string[]>([])
const month = ref('')
const values = ref<Record<string, string>>({})
const fallback = ref<Record<string, number>>({})
const loading = ref(false)
const saving = ref(false)
const dirty = ref(false)
const copyFrom = ref<{ store: string[]; month: string } | null>(null)

const isDefault = computed(() => !store.value.length)
const canEdit = computed(() => app.data.value.canWrite && (!isDefault.value || app.data.value.isAdmin))
const storeOpts = computed(() => app.data.value.stores.map((s) => ({ value: s.id, label: s.name, sub: s.code ?? '' })))

async function fetchScope(s: string | undefined, m: string) {
  return api.get('/budget', { store_id: s, month: m })
}
async function load() {
  loading.value = true
  try {
    const r = await fetchScope(store.value[0], month.value)
    values.value = Object.fromEntries(Object.entries(r.items).map(([k, v]) => [k, number2(Number(v))]))
    fallback.value = r.fallback
    dirty.value = false
  } catch (e: any) { toast.bad(e) } finally { loading.value = false }
}
watch([store, month], load, { deep: true })
onMounted(load)

const groups = computed(() => app.groupsSorted.value.filter((g) => g.active && g.kind !== 'transferencia')
  .map((g) => ({ g, cats: app.catsOfGroup(g.id).filter((c) => c.active) })).filter((x) => x.cats.length))

const eff = (id: string) => {
  const v = values.value[id]
  return v !== undefined && v !== '' ? parseMoney(v) || 0 : fallback.value[id] ?? 0
}
const totalKind = (k: string) => groups.value.filter((x) => x.g.kind === k).reduce((s, x) => s + x.cats.reduce((a, c) => a + eff(c.id), 0), 0)
const receita = computed(() => totalKind('receita'))
const groupSum = (x: any) => x.cats.reduce((a: number, c: any) => a + eff(c.id), 0)

async function save() {
  const items: Record<string, number> = {}
  for (const [k, v] of Object.entries(values.value)) {
    if (v === '' || v === undefined) continue
    const n = parseMoney(v)
    if (isNaN(n)) return toast.bad('Há valores inválidos.')
    items[k] = n
  }
  saving.value = true
  try {
    await api.post('/budget', { store_id: store.value[0] ?? null, month: month.value || null, items })
    toast.ok('Previsto salvo')
    load()
  } catch (e: any) { toast.bad(e) } finally { saving.value = false }
}

async function doCopy() {
  if (!copyFrom.value) return
  try {
    const r = await fetchScope(copyFrom.value.store[0], copyFrom.value.month)
    const merged = { ...r.fallback, ...r.items }
    values.value = Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, number2(Number(v))]))
    dirty.value = true
    copyFrom.value = null
    toast.info('Valores copiados. Confira e clique em Salvar.')
  } catch (e: any) { toast.bad(e) }
}
function clearAll() { values.value = {}; dirty.value = true }

const scopeText = computed(() => {
  const s = isDefault.value ? 'Modelo padrão (todas as lojas)' : app.storeMap.value[store.value[0]]?.name
  const m = month.value ? monthLong(month.value) : 'todos os meses'
  return `${s}, ${m}`
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Previsto</h1>
        <p>Metas de valor por categoria. Vale do mais específico para o mais geral: loja no mês, loja, padrão no mês, padrão.</p>
      </div>
    </div>

    <div class="card" style="margin-bottom: 16px">
      <div class="row">
        <label class="f" style="min-width: 260px">Para qual loja
          <MultiSelect v-model="store" :options="storeOpts" single all-label="Modelo padrão (todas as lojas)" placeholder="Buscar loja" />
        </label>
        <label class="f">Para qual mês
          <div class="row" style="gap: 6px">
            <input v-model="month" type="month" style="width: 170px">
            <button v-if="month" class="link" @click="month = ''">Todos os meses</button>
          </div>
        </label>
        <div class="spacer" />
        <button v-if="canEdit" class="btn ghost" @click="copyFrom = { store: [], month: '' }">Copiar de outro</button>
        <button v-if="canEdit" class="btn ghost" @click="clearAll">Limpar</button>
        <button v-if="canEdit" class="btn" :disabled="saving" @click="save">{{ saving ? 'Salvando...' : 'Salvar previsto' }}</button>
      </div>
      <p class="small muted" style="margin: 10px 0 0">
        Editando: <b>{{ scopeText }}</b>. Campos vazios usam o valor mais geral (mostrado em cinza).
        <span v-if="dirty" class="badge warn">Alterações não salvas</span>
      </p>
      <p v-if="isDefault && !app.data.value.isAdmin" class="small neg">Somente administradores alteram o modelo padrão.</p>
    </div>

    <div v-if="loading" class="loading-box"><span class="spinner" /> Carregando...</div>
    <div v-else class="grid g2">
      <div v-for="x in groups" :key="x.g.id" class="card">
        <div class="card-title">
          <h3 class="chip"><span class="dot" :style="{ background: x.g.color }" />{{ x.g.name }}</h3>
          <span class="small">
            <b>{{ money(groupSum(x)) }}</b>
            <span v-if="x.g.kind !== 'receita' && receita" class="muted"> ({{ pct(groupSum(x) / receita) }} da receita)</span>
          </span>
        </div>
        <div v-for="c in x.cats" :key="c.id" class="brow">
          <span>{{ c.name }}</span>
          <input v-model="values[c.id]" inputmode="decimal" :placeholder="fallback[c.id] !== undefined ? number2(fallback[c.id]) : '0,00'"
            :disabled="!canEdit" @input="dirty = true">
        </div>
      </div>
    </div>

    <Modal v-if="copyFrom" title="Copiar previsto de" @close="copyFrom = null">
      <label class="f">Loja<MultiSelect v-model="copyFrom.store" :options="storeOpts" single all-label="Modelo padrão (todas as lojas)" /></label>
      <label class="f">Mês (vazio = todos os meses)<input v-model="copyFrom.month" type="month"></label>
      <template #footer>
        <button class="btn ghost" @click="copyFrom = null">Cancelar</button>
        <button class="btn" @click="doCopy">Copiar valores</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.brow { display: grid; grid-template-columns: 1fr 150px; gap: 10px; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
.brow input { text-align: right; min-height: 36px; padding: 6px 10px; }
.brow input::placeholder { color: #A4B1A7; }
</style>
