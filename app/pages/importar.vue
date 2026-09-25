<script setup lang="ts">
const app = useApp()
const api = useApi()
const toast = useToast()
const { f } = useFilters()

const acc = ref<string[]>(f.value.accounts.length === 1 ? [f.value.accounts[0]] : [])
const file = ref<File | null>(null)
const drag = ref(false)
const reading = ref(false)
const result = ref<any>(null)
const saving = ref(false)
const history = ref<any[]>([])

const accountOpts = computed(() => app.data.value.accounts.filter((a) => a.active)
  .map((a) => ({ value: a.id, label: a.name, sub: app.storeMap.value[a.store_id]?.name ?? '' })))
watch(accountOpts, (o) => { if (!acc.value.length && o.length === 1) acc.value = [o[0].value] }, { immediate: true })

async function loadHistory() {
  try { history.value = await api.get('/imports', { stores: f.value.stores }) } catch {}
}
onMounted(loadHistory)

function pick(e: Event) {
  const fl = (e.target as HTMLInputElement).files?.[0]
  if (fl) setFile(fl)
}
function drop(e: DragEvent) {
  drag.value = false
  const fl = e.dataTransfer?.files?.[0]
  if (fl) setFile(fl)
}
function setFile(fl: File) {
  if (!/pdf$/i.test(fl.type) && !/\.pdf$/i.test(fl.name)) return toast.bad('Envie um arquivo PDF.')
  if (fl.size > 20 * 1024 * 1024) return toast.bad('Arquivo maior que 20 MB. Divida o extrato.')
  file.value = fl
}

const toBase64 = (fl: File) => new Promise<string>((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result).split(',')[1])
  r.onerror = () => rej(new Error('Não consegui ler o arquivo.'))
  r.readAsDataURL(fl)
})

async function read() {
  if (!acc.value[0]) return toast.bad('Escolha a conta do extrato.')
  if (!file.value) return toast.bad('Escolha o PDF.')
  reading.value = true
  try {
    const pdf_base64 = await toBase64(file.value)
    const r = await api.post('/import/parse', { account_id: acc.value[0], file_name: file.value.name, pdf_base64 })
    r.lines = r.lines.map((l: any) => ({ ...l, include: !l.duplicate }))
    result.value = r
    if (!r.lines.length) toast.info('Não encontrei lançamentos neste PDF.')
  } catch (e: any) { toast.bad(e) } finally { reading.value = false }
}

const included = computed(() => (result.value?.lines ?? []).filter((l: any) => l.include))
const sumIn = computed(() => included.value.filter((l: any) => l.direction === 'entrada').reduce((s: number, l: any) => s + l.amount, 0))
const sumOut = computed(() => included.value.filter((l: any) => l.direction === 'saida').reduce((s: number, l: any) => s + l.amount, 0))
const allIn = computed(() => (result.value?.lines ?? []).reduce((s: number, l: any) => s + (l.direction === 'entrada' ? l.amount : -l.amount), 0))
const check = computed(() => {
  const r = result.value
  if (!r || r.opening_balance === null || r.closing_balance === null) return null
  return Math.round((r.opening_balance + allIn.value - r.closing_balance) * 100) / 100
})
const noCat = computed(() => included.value.filter((l: any) => !l.category_id).length)
const dupes = computed(() => (result.value?.lines ?? []).filter((l: any) => l.duplicate).length)

async function commit() {
  saving.value = true
  try {
    const r = await api.post('/import/commit', {
      import_id: result.value.import_id, lines: result.value.lines,
      closing_balance: result.value.closing_balance, period_end: result.value.period_end,
    })
    toast.ok(`${r.inserted} lançamentos importados${r.skipped ? ` (${r.skipped} já existiam)` : ''}`)
    result.value = null
    file.value = null
    loadHistory()
  } catch (e: any) { toast.bad(e) } finally { saving.value = false }
}

async function undo(h: any) {
  if (!confirm('Desfazer esta importação? Os lançamentos que vieram dela serão excluídos.')) return
  try { await api.del(`/imports/${h.id}`); toast.ok('Importação desfeita'); loadHistory() } catch (e: any) { toast.bad(e) }
}
const statusLabel: Record<string, [string, string]> = { lido: ['Não concluída', 'warn'], importado: ['Importada', 'ok'], desfeito: ['Desfeita', ''] }
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Importar extrato</h1>
        <p>Envie o PDF do banco. A IA lê os lançamentos e sugere as categorias. Você confere antes de salvar.</p>
      </div>
    </div>

    <div v-if="!result" class="grid" style="grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr)" :class="{ stack: true }">
      <div class="card up">
        <label class="f">Conta do extrato
          <MultiSelect v-model="acc" :options="accountOpts" single all-label="Selecione a conta" placeholder="Buscar conta ou loja" />
        </label>
        <p v-if="!accountOpts.length" class="small muted">Nenhuma conta cadastrada. <NuxtLink to="/cadastros?tab=contas">Cadastrar conta</NuxtLink></p>

        <label class="drop" :class="{ drag, has: file }" @dragover.prevent="drag = true" @dragleave="drag = false" @drop.prevent="drop">
          <input type="file" accept="application/pdf,.pdf" hidden @change="pick">
          <Icon name="upload" size="34" />
          <strong v-if="file">{{ file.name }}</strong>
          <strong v-else>Arraste o PDF aqui ou clique para escolher</strong>
          <span class="small muted">{{ file ? `${(file.size / 1024).toFixed(0)} KB` : 'Extrato em PDF, até 20 MB' }}</span>
        </label>

        <button class="btn yellow" style="width: 100%; padding: 13px" :disabled="reading || !file || !acc[0]" @click="read">
          <span v-if="reading" class="spinner" style="width: 18px; height: 18px" />
          {{ reading ? 'Lendo o extrato... pode levar até 1 minuto' : 'Ler extrato' }}
        </button>
      </div>

      <div class="card">
        <div class="card-title"><h3>Últimas importações</h3></div>
        <div v-if="!history.length" class="empty small">Nenhuma importação ainda.</div>
        <div v-for="h in history.slice(0, 12)" :key="h.id" class="hist">
          <div>
            <strong>{{ app.accountLabel(h.account_id) }}</strong>
            <div class="small muted">
              {{ app.storeMap.value[h.store_id]?.name }} — {{ dateBR(h.period_start) }} a {{ dateBR(h.period_end) }}, {{ h.imported_lines }} de {{ h.total_lines }} linhas
            </div>
          </div>
          <span class="badge" :class="statusLabel[h.status]?.[1]">{{ statusLabel[h.status]?.[0] }}</span>
          <button v-if="h.status === 'importado'" class="link danger small" @click="undo(h)">Desfazer</button>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="grid g4" style="margin-bottom: 16px">
        <KpiCard label="Período" :value="`${dateBR(result.period_start)?.slice(0, 5)} a ${dateBR(result.period_end)?.slice(0, 5)}`" :hint="result.bank || app.accountLabel(acc[0])" />
        <KpiCard label="Entradas selecionadas" :value="money(sumIn)" tone="pos" />
        <KpiCard label="Saídas selecionadas" :value="money(sumOut)" tone="neg" />
        <KpiCard accent label="Saldo final do extrato" :value="money(result.closing_balance)"
          :hint="check === null ? 'Saldo inicial/final não encontrado' : check === 0 ? 'O extrato confere' : `Diferença de ${money(check)}. Confira as linhas.`" />
      </div>

      <div class="card">
        <div class="row" style="margin-bottom: 12px">
          <span class="badge ok">{{ included.length }} selecionados</span>
          <span v-if="dupes" class="badge warn">{{ dupes }} já importados antes (desmarcados)</span>
          <span v-if="noCat" class="badge bad">{{ noCat }} sem categoria</span>
          <div class="spacer" />
          <button class="btn ghost" @click="result = null">Cancelar</button>
          <button class="btn" :disabled="saving || !included.length" @click="commit">
            {{ saving ? 'Importando...' : `Importar ${included.length} lançamentos` }}
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th /><th>Data</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th></tr></thead>
            <tbody>
              <tr v-for="(l, i) in result.lines" :key="i" :style="{ opacity: l.include ? 1 : .45 }">
                <td><input v-model="l.include" type="checkbox"></td>
                <td>{{ dateBR(l.date) }}</td>
                <td>{{ l.description }} <span v-if="l.duplicate" class="badge warn">já existe</span></td>
                <td style="min-width: 220px">
                  <CatSelect v-model="l.category_id" :direction="l.direction" :style="{ borderColor: l.category_id ? '' : 'var(--yellow)' }" />
                </td>
                <td class="num" :class="l.direction === 'entrada' ? 'pos' : 'neg'">
                  {{ l.direction === 'entrada' ? '+' : '−' }} {{ money(l.amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="small muted" style="margin-top: 12px">
          Dica: para a IA acertar mais, cadastre palavras-chave nas categorias (Cadastros > Categorias).
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.up { display: grid; gap: 16px; align-content: start; }
.drop { border: 2.5px dashed var(--line); border-radius: var(--radius); padding: 38px 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; cursor: pointer; color: var(--green); transition: background .15s, border-color .15s; }
.drop:hover, .drop.drag { border-color: var(--green); background: var(--green-soft); }
.drop.has { border-style: solid; border-color: var(--green); background: var(--green-soft); }
.drop strong { color: var(--ink); }
.hist { display: flex; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); }
.hist > div { flex: 1; min-width: 0; }
@media (max-width: 1000px) { .stack { grid-template-columns: 1fr !important; } }
</style>
