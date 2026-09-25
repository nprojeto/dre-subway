<script setup lang="ts">
/**
 * Editor genérico de cadastros: lista, busca, cria, edita, desativa e exclui.
 * Usado para lojas, contas, bancos, grupos e categorias.
 */
type Field = {
  key: string
  label: string
  type?: 'text' | 'number' | 'money' | 'select' | 'bool' | 'tags' | 'color' | 'store'
  options?: { value: any; label: string }[]
  required?: boolean
  list?: boolean
  show?: (row: any) => string
  default?: any
  help?: string
  half?: boolean
}

const props = defineProps<{
  table: string
  singular: string
  fields: Field[]
  rows: any[]
  readonly?: boolean
  defaults?: Record<string, any>
}>()
const emit = defineEmits(['changed'])
const api = useApi()
const toast = useToast()
const app = useApp()

const term = ref('')
const onlyActive = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const page = ref(0)
const PAGE = 100

const norm = (s: any) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const listFields = computed(() => props.fields.filter((f) => f.list !== false))
const hasActive = computed(() => props.fields.some((f) => f.key === 'active'))
const filtered = computed(() => {
  const t = norm(term.value)
  return props.rows.filter((r) =>
    (!onlyActive.value || r.active !== false) &&
    (!t || listFields.value.some((f) => norm(display(r, f)).includes(t))))
})
const shown = computed(() => filtered.value.slice(page.value * PAGE, (page.value + 1) * PAGE))
watch(term, () => (page.value = 0))

const storeOpts = computed(() => app.data.value.stores.map((s) => ({ value: s.id, label: s.name, sub: s.code ?? '' })))

function display(row: any, f: Field) {
  if (f.show) return f.show(row)
  const v = row[f.key]
  if (f.type === 'bool') return v ? 'Sim' : 'Não'
  if (f.type === 'money') return money(Number(v ?? 0))
  if (f.type === 'tags') return (v ?? []).join(', ')
  if (f.type === 'store') return app.storeMap.value[v]?.name ?? ''
  if (f.type === 'select') return f.options?.find((o) => o.value === v)?.label ?? ''
  return v ?? ''
}

function openNew() {
  const o: any = {}
  props.fields.forEach((f) => (o[f.key] = f.default ?? (f.type === 'bool' ? true : f.type === 'tags' ? '' : null)))
  Object.assign(o, props.defaults ?? {})
  editing.value = o
}
function openEdit(row: any) {
  const o: any = { ...row }
  props.fields.forEach((f) => { if (f.type === 'tags') o[f.key] = (row[f.key] ?? []).join(', ') })
  o._store = row.store_id ? [row.store_id] : []
  editing.value = o
}

async function save() {
  const e = editing.value
  for (const f of props.fields) {
    const v = f.type === 'store' ? e._store?.[0] : e[f.key]
    if (f.required && (v === null || v === undefined || v === '')) return toast.bad(`Preencha: ${f.label}`)
  }
  const body: any = {}
  for (const f of props.fields) {
    let v = e[f.key]
    if (f.type === 'tags') v = String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    if (f.type === 'number' || f.type === 'money') v = v === '' || v === null ? null : Number(v)
    if (f.type === 'store') v = e._store?.[0] ?? null
    body[f.key] = v
  }
  saving.value = true
  try {
    if (e.id) await api.patch(`/crud/${props.table}/${e.id}`, body)
    else await api.post(`/crud/${props.table}`, body)
    toast.ok(e.id ? 'Alterações salvas' : `${props.singular} criado(a)`)
    editing.value = null
    emit('changed')
  } catch (err: any) { toast.bad(err) } finally { saving.value = false }
}

async function remove(row: any) {
  if (!confirm(`Excluir "${row.name}"? Esta ação não pode ser desfeita.`)) return
  try {
    await api.del(`/crud/${props.table}/${row.id}`)
    toast.ok('Excluído')
    emit('changed')
  } catch (err: any) { toast.bad(err) }
}

async function toggleActive(row: any) {
  try {
    await api.patch(`/crud/${props.table}/${row.id}`, { active: !row.active })
    emit('changed')
  } catch (err: any) { toast.bad(err) }
}
</script>

<template>
  <div class="card">
    <div class="row" style="margin-bottom: 14px">
      <input v-model="term" placeholder="Buscar..." style="max-width: 320px">
      <label v-if="hasActive" class="row small muted" style="gap: 6px">
        <input v-model="onlyActive" type="checkbox"> Só ativos
      </label>
      <span class="muted small">{{ filtered.length }} {{ filtered.length === 1 ? 'item' : 'itens' }}</span>
      <div class="spacer" />
      <slot name="actions" />
      <button v-if="!readonly" class="btn" @click="openNew">+ Novo(a) {{ singular.toLowerCase() }}</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th v-for="f in listFields" :key="f.key" :class="{ num: f.type === 'money' || f.type === 'number' }">{{ f.label }}</th>
            <th v-if="!readonly" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in shown" :key="r.id" :style="{ opacity: r.active === false ? .55 : 1 }">
            <td v-for="f in listFields" :key="f.key" :class="{ num: f.type === 'money' || f.type === 'number' }">
              <template v-if="f.key === 'active'">
                <button class="badge" :class="r.active ? 'ok' : ''" :disabled="readonly" style="border:0;cursor:pointer" @click="toggleActive(r)">
                  {{ r.active ? 'Ativo' : 'Inativo' }}
                </button>
              </template>
              <template v-else-if="f.type === 'color'"><span class="dot" :style="{ background: r[f.key] }" /></template>
              <template v-else>{{ display(r, f) }}</template>
            </td>
            <td v-if="!readonly" class="num">
              <button class="link" @click="openEdit(r)">Editar</button>
              <button class="link danger" @click="remove(r)">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filtered.length" class="empty">
        <h3>Nada por aqui</h3>
        <p>{{ readonly ? 'Nenhum registro.' : `Clique em "Novo(a) ${singular.toLowerCase()}" para cadastrar.` }}</p>
      </div>
    </div>
    <div v-if="filtered.length > PAGE" class="row" style="justify-content: center; margin-top: 12px">
      <button class="btn ghost sm" :disabled="page === 0" @click="page--">Anterior</button>
      <span class="small muted">Página {{ page + 1 }} de {{ Math.ceil(filtered.length / PAGE) }}</span>
      <button class="btn ghost sm" :disabled="(page + 1) * PAGE >= filtered.length" @click="page++">Próxima</button>
    </div>

    <Modal v-if="editing" :title="editing.id ? `Editar ${singular.toLowerCase()}` : `Novo(a) ${singular.toLowerCase()}`" @close="editing = null">
      <div class="grid g2">
        <label v-for="f in fields" :key="f.key" class="f" :style="{ gridColumn: f.half ? 'auto' : '1 / -1' }">
          <span v-if="f.type !== 'bool'">{{ f.label }}{{ f.required ? ' *' : '' }}</span>
          <select v-if="f.type === 'select'" v-model="editing[f.key]">
            <option :value="null">Selecione...</option>
            <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <MultiSelect v-else-if="f.type === 'store'" v-model="editing._store" :options="storeOpts" single all-label="Selecione a loja" />
          <span v-else-if="f.type === 'bool'" class="row" style="gap: 8px; color: var(--ink)">
            <input v-model="editing[f.key]" type="checkbox"> {{ f.label }}
          </span>
          <input v-else-if="f.type === 'color'" v-model="editing[f.key]" type="color">
          <input v-else-if="f.type === 'number' || f.type === 'money'" v-model="editing[f.key]" type="number" step="0.01">
          <input v-else v-model="editing[f.key]" type="text">
          <small v-if="f.help" class="muted" style="font-weight: 400">{{ f.help }}</small>
        </label>
      </div>
      <template #footer>
        <button class="btn ghost" @click="editing = null">Cancelar</button>
        <button class="btn" :disabled="saving" @click="save">{{ saving ? 'Salvando...' : 'Salvar' }}</button>
      </template>
    </Modal>
  </div>
</template>
