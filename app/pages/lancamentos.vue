<script setup lang="ts">
const app = useApp()
const api = useApi()
const toast = useToast()
const route = useRoute()
const { f, range } = useFilters()

const q = ref('')
const category = ref<string | null>(null)
const direction = ref('')
const uncat = ref(route.query.uncat === '1')
const page = ref(0)
const size = 50
const data = ref<any>({ rows: [], total: 0, sum_in: 0, sum_out: 0 })
const loading = ref(false)
const sel = ref<Set<string>>(new Set())
const bulkCat = ref<string | null>(null)
const editing = ref<any>(null)
const saving = ref(false)
const canWrite = computed(() => app.data.value.canWrite)

let t: any
async function load() {
  loading.value = true
  try {
    data.value = await api.get('/transactions', {
      stores: f.value.stores, accounts: f.value.accounts, from: range.value.from, to: range.value.to,
      q: q.value, category: category.value, direction: direction.value, uncat: uncat.value ? '1' : '', page: page.value, size,
    })
    sel.value = new Set()
  } catch (e: any) { toast.bad(e) } finally { loading.value = false }
}
watch(() => [f.value.stores, f.value.accounts, range.value.from, range.value.to, category.value, direction.value, uncat.value], () => { page.value = 0; load() }, { deep: true })
watch(q, () => { clearTimeout(t); t = setTimeout(() => { page.value = 0; load() }, 350) })
watch(page, load)
onMounted(load)

const pages = computed(() => Math.max(1, Math.ceil(data.value.total / size)))
const allSel = computed(() => data.value.rows.length > 0 && data.value.rows.every((r: any) => sel.value.has(r.id)))
function toggleAll() {
  const s = new Set(sel.value)
  allSel.value ? data.value.rows.forEach((r: any) => s.delete(r.id)) : data.value.rows.forEach((r: any) => s.add(r.id))
  sel.value = s
}
function toggle(id: string) { const s = new Set(sel.value); s.has(id) ? s.delete(id) : s.add(id); sel.value = s }

async function setCategory(row: any, cat: string | null) {
  try {
    await api.patch(`/transactions/${row.id}`, { category_id: cat })
    row.category_id = cat
  } catch (e: any) { toast.bad(e) }
}
async function bulkApply() {
  try {
    await api.post('/transactions/bulk-update', { ids: [...sel.value], category_id: bulkCat.value })
    toast.ok(`${sel.value.size} lançamentos atualizados`)
    bulkCat.value = null
    load()
  } catch (e: any) { toast.bad(e) }
}
async function bulkDelete() {
  if (!confirm(`Excluir ${sel.value.size} lançamentos?`)) return
  try {
    await api.post('/transactions/bulk-delete', { ids: [...sel.value] })
    toast.ok('Lançamentos excluídos')
    load()
  } catch (e: any) { toast.bad(e) }
}

const accountOpts = computed(() => {
  const st = new Set(f.value.stores)
  return app.data.value.accounts.filter((a) => a.active && (!st.size || st.has(a.store_id)))
    .map((a) => ({ value: a.id, label: a.name, sub: app.storeMap.value[a.store_id]?.name ?? '' }))
})

function openNew() {
  editing.value = {
    date: today(), direction: 'saida', amount: '', description: '', category_id: null, notes: '',
    _acc: f.value.accounts.length === 1 ? [f.value.accounts[0]] : accountOpts.value.length === 1 ? [accountOpts.value[0].value] : [],
  }
}
function openEdit(r: any) { editing.value = { ...r, amount: number2(Number(r.amount)), _acc: [r.account_id] } }

async function save() {
  const e = editing.value
  const amount = parseMoney(e.amount)
  if (!e._acc?.[0]) return toast.bad('Escolha a conta.')
  if (!amount || amount <= 0) return toast.bad('Informe um valor maior que zero.')
  const body = { account_id: e._acc[0], date: e.date, direction: e.direction, amount, description: e.description, category_id: e.category_id, notes: e.notes }
  saving.value = true
  try {
    e.id ? await api.patch(`/transactions/${e.id}`, body) : await api.post('/transactions', body)
    toast.ok(e.id ? 'Lançamento atualizado' : 'Lançamento criado')
    editing.value = null
    load()
  } catch (err: any) { toast.bad(err) } finally { saving.value = false }
}
async function remove(r: any) {
  if (!confirm('Excluir este lançamento?')) return
  try { await api.del(`/transactions/${r.id}`); toast.ok('Excluído'); load() } catch (e: any) { toast.bad(e) }
}
watch(() => editing.value?.direction, (d, old) => {
  if (editing.value && old && d !== old) editing.value.category_id = null
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Lançamentos</h1>
        <p>{{ data.total }} lançamentos no período</p>
      </div>
      <div class="spacer" />
      <FilterBar />
    </div>

    <div class="card">
      <div class="row" style="margin-bottom: 14px">
        <input v-model="q" placeholder="Buscar na descrição..." style="max-width: 260px">
        <CatSelect v-model="category" empty-label="Todas as categorias" style="max-width: 230px" />
        <select v-model="direction" style="max-width: 150px">
          <option value="">Entradas e saídas</option>
          <option value="entrada">Só entradas</option>
          <option value="saida">Só saídas</option>
        </select>
        <label class="row small" style="gap: 6px"><input v-model="uncat" type="checkbox"> Só sem categoria</label>
        <div class="spacer" />
        <button v-if="canWrite" class="btn" @click="openNew">+ Novo lançamento</button>
      </div>

      <div class="row totals">
        <span>Entradas <b class="pos">{{ money(Number(data.sum_in)) }}</b></span>
        <span>Saídas <b class="neg">{{ money(Number(data.sum_out)) }}</b></span>
        <span>Diferença <b>{{ money(Number(data.sum_in) - Number(data.sum_out)) }}</b></span>
      </div>

      <div v-if="sel.size && canWrite" class="bulk row">
        <b>{{ sel.size }} selecionados</b>
        <CatSelect v-model="bulkCat" empty-label="Sem categoria" style="max-width: 260px" />
        <button class="btn sm" @click="bulkApply">Aplicar categoria</button>
        <div class="spacer" />
        <button class="btn danger sm" @click="bulkDelete">Excluir selecionados</button>
      </div>

      <div class="table-wrap" :style="{ opacity: loading ? .5 : 1 }">
        <table>
          <thead>
            <tr>
              <th v-if="canWrite"><input type="checkbox" :checked="allSel" aria-label="Selecionar todos" @change="toggleAll"></th>
              <th>Data</th>
              <th v-if="app.data.value.stores.length > 1">Loja</th>
              <th>Conta</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th class="num">Valor</th>
              <th v-if="canWrite" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data.rows" :key="r.id">
              <td v-if="canWrite"><input type="checkbox" :checked="sel.has(r.id)" @change="toggle(r.id)"></td>
              <td>{{ dateBR(r.date) }}</td>
              <td v-if="app.data.value.stores.length > 1" class="small">{{ app.storeMap.value[r.store_id]?.name }}</td>
              <td class="small">{{ app.accountLabel(r.account_id) }}</td>
              <td>
                {{ r.description }}
                <span v-if="r.source === 'pdf'" class="badge" title="Veio de extrato">extrato</span>
              </td>
              <td style="min-width: 210px">
                <CatSelect v-if="canWrite" :model-value="r.category_id" :direction="r.direction" @update:model-value="setCategory(r, $event)"
                  :style="{ borderColor: r.category_id ? '' : 'var(--yellow)' }" />
                <span v-else>{{ app.catMap.value[r.category_id]?.name ?? 'Sem categoria' }}</span>
              </td>
              <td class="num" :class="r.direction === 'entrada' ? 'pos' : 'neg'">
                {{ r.direction === 'entrada' ? '+' : '−' }} {{ money(Number(r.amount)) }}
              </td>
              <td v-if="canWrite" class="num">
                <button class="link" @click="openEdit(r)">Editar</button>
                <button class="link danger" @click="remove(r)">Excluir</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!data.rows.length && !loading" class="empty">
          <h3>Nenhum lançamento encontrado</h3>
          <p>Mude o período ou os filtros, ou <NuxtLink to="/importar">importe um extrato</NuxtLink>.</p>
        </div>
      </div>

      <div v-if="pages > 1" class="row" style="justify-content: center; margin-top: 14px">
        <button class="btn ghost sm" :disabled="page === 0" @click="page--">Anterior</button>
        <span class="small muted">Página {{ page + 1 }} de {{ pages }}</span>
        <button class="btn ghost sm" :disabled="page + 1 >= pages" @click="page++">Próxima</button>
      </div>
    </div>

    <Modal v-if="editing" :title="editing.id ? 'Editar lançamento' : 'Novo lançamento'" @close="editing = null">
      <div class="seg">
        <button :class="{ on: editing.direction === 'entrada' }" @click="editing.direction = 'entrada'">Entrada</button>
        <button :class="{ on: editing.direction === 'saida' }" @click="editing.direction = 'saida'">Saída</button>
      </div>
      <label class="f">Conta *<MultiSelect v-model="editing._acc" :options="accountOpts" single all-label="Selecione a conta" /></label>
      <div class="grid g2">
        <label class="f">Data *<input v-model="editing.date" type="date"></label>
        <label class="f">Valor (R$) *<input v-model="editing.amount" inputmode="decimal" placeholder="0,00"></label>
      </div>
      <label class="f">Descrição<input v-model="editing.description"></label>
      <label class="f">Categoria<CatSelect v-model="editing.category_id" :direction="editing.direction" /></label>
      <label class="f">Observação<input v-model="editing.notes"></label>
      <template #footer>
        <button class="btn ghost" @click="editing = null">Cancelar</button>
        <button class="btn" :disabled="saving" @click="save">{{ saving ? 'Salvando...' : 'Salvar' }}</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.totals { gap: 24px; margin-bottom: 12px; font-size: 14px; color: var(--muted); }
.totals b { font-family: var(--display); font-size: 18px; margin-left: 4px; }
.bulk { background: var(--green-soft); padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 12px; }
.seg { display: grid; grid-template-columns: 1fr 1fr; background: var(--bg); border-radius: 999px; padding: 4px; }
.seg button { border: 0; background: none; padding: 9px; border-radius: 999px; font: 600 14px var(--font); cursor: pointer; color: var(--muted); }
.seg button.on { background: var(--green); color: #fff; }
.seg button.on:last-child { background: var(--yellow); color: var(--green-dark); }
</style>
