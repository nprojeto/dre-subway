<script setup lang="ts">
const app = useApp()
const api = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const isAdmin = computed(() => app.data.value.isAdmin)
const tabs = computed(() => [
  { k: 'lojas', label: 'Lojas' },
  { k: 'contas', label: 'Contas bancárias' },
  { k: 'bancos', label: 'Bancos' },
  { k: 'grupos', label: 'Grupos (DRE)' },
  { k: 'categorias', label: 'Categorias' },
])
const tab = computed({
  get: () => String(route.query.tab || 'lojas'),
  set: (v) => router.replace({ query: { tab: v } }),
})
const reload = () => app.load()

const kinds = [
  { value: 'receita', label: 'Receita' },
  { value: 'despesa', label: 'Despesa' },
  { value: 'retirada', label: 'Retirada de sócios' },
  { value: 'transferencia', label: 'Transferência (fora da DRE)' },
]
const dirs = [{ value: 'entrada', label: 'Entrada' }, { value: 'saida', label: 'Saída' }]

const storeFields = [
  { key: 'code', label: 'Código', half: true },
  { key: 'name', label: 'Nome da loja', required: true },
  { key: 'city', label: 'Cidade', half: true },
  { key: 'state', label: 'UF', half: true },
  { key: 'cnpj', label: 'CNPJ', half: true, list: false },
  { key: 'active', label: 'Ativa', type: 'bool' },
]
const accountFields = computed(() => [
  { key: 'store_id', label: 'Loja', type: 'store', required: true },
  { key: 'bank_id', label: 'Banco', type: 'select', options: app.data.value.banks.filter((b) => b.active).map((b) => ({ value: b.id, label: b.name })), half: true },
  { key: 'name', label: 'Nome da conta', required: true, half: true, help: 'Ex.: Santander - conta principal' },
  { key: 'agency', label: 'Agência', half: true, list: false },
  { key: 'number', label: 'Conta', half: true, list: false },
  { key: 'opening_balance', label: 'Saldo inicial', type: 'money', help: 'Saldo da conta antes do primeiro lançamento no sistema.' },
  { key: 'active', label: 'Ativa', type: 'bool' },
])
const bankFields = [
  { key: 'name', label: 'Nome do banco', required: true },
  { key: 'code', label: 'Código (Febraban)', half: true },
  { key: 'active', label: 'Ativo', type: 'bool' },
]
const groupFields = [
  { key: 'name', label: 'Nome do grupo', required: true },
  { key: 'kind', label: 'Tipo na DRE', type: 'select', options: kinds, required: true, half: true },
  { key: 'sort', label: 'Ordem', type: 'number', half: true, default: 100 },
  { key: 'target_pct', label: 'Meta (% da receita)', type: 'number', half: true, help: 'Ex.: 35 para CMV. Vazio = sem meta.' },
  { key: 'color', label: 'Cor', type: 'color', half: true, default: '#008C15' },
  { key: 'active', label: 'Ativo', type: 'bool' },
]
const catFields = computed(() => [
  { key: 'name', label: 'Nome da categoria', required: true },
  { key: 'group_id', label: 'Grupo', type: 'select', required: true, half: true, options: app.groupsSorted.value.map((g) => ({ value: g.id, label: g.name })) },
  { key: 'direction', label: 'Tipo', type: 'select', options: dirs, required: true, half: true },
  { key: 'keywords', label: 'Palavras-chave do extrato', type: 'tags', help: 'Separe por vírgula. Se a descrição do extrato tiver uma delas, a categoria é aplicada automaticamente.' },
  { key: 'sort', label: 'Ordem', type: 'number', half: true, default: 100 },
  { key: 'active', label: 'Ativa', type: 'bool' },
])

const accountsSorted = computed(() => [...app.data.value.accounts].sort((a, b) =>
  (app.storeMap.value[a.store_id]?.name ?? '').localeCompare(app.storeMap.value[b.store_id]?.name ?? '') || a.name.localeCompare(b.name)))
const catsSorted = computed(() => {
  const order = Object.fromEntries(app.groupsSorted.value.map((g, i) => [g.id, i]))
  return [...app.data.value.categories].sort((a, b) => (order[a.group_id] - order[b.group_id]) || a.sort - b.sort)
})
const catListFields = computed(() => catFields.value.map((f) =>
  f.key === 'group_id' ? { ...f, show: (r: any) => app.groupMap.value[r.group_id]?.name ?? '' } : f))
const accListFields = computed(() => accountFields.value.map((f) =>
  f.key === 'bank_id' ? { ...f, show: (r: any) => app.bankMap.value[r.bank_id]?.name ?? '' } : f))

// importação de lojas em massa
const bulk = ref<string | null>(null)
const bulkSaving = ref(false)
const bulkRows = computed(() => (bulk.value ?? '').split('\n').map((l) => l.split(/[;\t]/).map((s) => s.trim()))
  .filter((c) => c[1] || c[0]).map((c) => ({ code: c[0] || null, name: c[1] || c[0], city: c[2] || null, state: c[3] || null, active: true })))
async function bulkSave() {
  bulkSaving.value = true
  try {
    const rows = bulkRows.value
    for (let i = 0; i < rows.length; i += 500) await api.post('/crud/stores', { rows: rows.slice(i, i + 500) })
    toast.ok(`${rows.length} lojas cadastradas`)
    bulk.value = null
    reload()
  } catch (e: any) { toast.bad(e) } finally { bulkSaving.value = false }
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Cadastros</h1>
        <p>Tudo aqui pode ser criado, alterado, desativado ou excluído.</p>
      </div>
    </div>

    <div class="tabs">
      <button v-for="t in tabs" :key="t.k" :class="{ on: tab === t.k }" @click="tab = t.k">{{ t.label }}</button>
    </div>

    <CrudEditor v-if="tab === 'lojas'" table="stores" singular="Loja" :fields="storeFields" :rows="app.data.value.stores" :readonly="!isAdmin" @changed="reload">
      <template #actions>
        <button v-if="isAdmin" class="btn ghost" @click="bulk = ''">Colar lista de lojas</button>
      </template>
    </CrudEditor>
    <CrudEditor v-if="tab === 'contas'" table="accounts" singular="Conta" :fields="accListFields" :rows="accountsSorted" :readonly="!app.data.value.canWrite" @changed="reload" />
    <CrudEditor v-if="tab === 'bancos'" table="banks" singular="Banco" :fields="bankFields" :rows="app.data.value.banks" :readonly="!isAdmin" @changed="reload" />
    <CrudEditor v-if="tab === 'grupos'" table="category_groups" singular="Grupo" :fields="groupFields" :rows="app.groupsSorted.value" :readonly="!isAdmin" @changed="reload" />
    <CrudEditor v-if="tab === 'categorias'" table="categories" singular="Categoria" :fields="catListFields" :rows="catsSorted" :readonly="!isAdmin" @changed="reload" />

    <Modal v-if="bulk !== null" title="Colar lista de lojas" wide @close="bulk = null">
      <p class="small muted" style="margin: 0">
        Copie da planilha as colunas <b>código, nome, cidade, UF</b> (nessa ordem) e cole abaixo. Uma loja por linha.
      </p>
      <textarea v-model="bulk" rows="10" placeholder="EQ001	Subway Equilíbrio	Cidade	SP" />
      <p class="small"><b>{{ bulkRows.length }}</b> lojas reconhecidas.</p>
      <template #footer>
        <button class="btn ghost" @click="bulk = null">Cancelar</button>
        <button class="btn" :disabled="!bulkRows.length || bulkSaving" @click="bulkSave">{{ bulkSaving ? 'Salvando...' : `Cadastrar ${bulkRows.length} lojas` }}</button>
      </template>
    </Modal>
  </div>
</template>
