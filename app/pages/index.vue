<script setup lang="ts">
import { bucketList } from '~/utils/report'

const app = useApp()
const api = useApi()
const { f } = useFilters()
const { report: r, loading, grain, range } = useReport()

// ---------- ranking de lojas ----------
const ranking = ref<any[]>([])
const rankSort = ref<'resultado' | 'receita' | 'margem'>('resultado')
const multiStore = computed(() => app.data.value.stores.length > 1 && f.value.stores.length !== 1)
async function loadRanking() {
  if (!multiStore.value) { ranking.value = []; return }
  try { ranking.value = await api.post('/ranking', { store_ids: f.value.stores, from: range.value.from, to: range.value.to }) }
  catch { ranking.value = [] }
}
watch(() => [f.value.stores, range.value.from, range.value.to], loadRanking, { deep: true })
onMounted(loadRanking)
const rankRows = computed(() => {
  const rows = ranking.value.map((x) => ({ ...x, margem: Number(x.receita) ? Number(x.resultado) / Number(x.receita) : null }))
  return rows.sort((a, b) => (Number(b[rankSort.value]) || -1e15) - (Number(a[rankSort.value]) || -1e15))
})

// ---------- KPIs ----------
const vsPrev = (real: number, prev: number) => (prev ? `${pct(real / prev - 1)} vs previsto (${money(prev)})` : 'sem previsto')

// ---------- gráficos ----------
const labels = computed(() => bucketList(range.value.from, range.value.to, grain.value))
const flowChart = computed(() => {
  if (!r.value) return null
  let saldo = r.value.opening
  const ins: number[] = [], outs: number[] = [], bal: number[] = []
  for (const b of labels.value) {
    const x = r.value.buckets[b] ?? { in: 0, out: 0 }
    ins.push(x.in); outs.push(x.out); saldo += x.in - x.out; bal.push(saldo)
  }
  return {
    type: 'bar',
    data: {
      labels: labels.value.map((b) => (grain.value === 'day' ? dayLabel(b) : monthLabel(b))),
      datasets: [
        { type: 'line', label: 'Saldo', data: bal, borderColor: '#00391A', backgroundColor: '#00391A', pointRadius: 0, borderWidth: 2.5, tension: .3, yAxisID: 'y1' },
        { label: 'Entradas', data: ins, backgroundColor: getVar('--green'), borderRadius: 4 },
        { label: 'Saídas', data: outs, backgroundColor: getVar('--yellow'), borderRadius: 4 },
      ],
    },
    options: {
      maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { tooltip: { callbacks: { label: (c: any) => `${c.dataset.label}: ${money(c.raw)}` } } },
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: (v: any) => moneyShort(v) }, grid: { color: '#EEF2EC' } },
        y1: { position: 'right', ticks: { callback: (v: any) => moneyShort(v) }, grid: { display: false } },
      },
    },
  } as any
})

const expenseGroups = computed(() =>
  (r.value?.groupRows ?? []).filter((g) => ['despesa', 'retirada'].includes(g.group.kind) && g.real > 0))

const donut = computed(() => ({
  type: 'doughnut',
  data: {
    labels: expenseGroups.value.map((g) => g.group.name),
    datasets: [{ data: expenseGroups.value.map((g) => g.real), backgroundColor: expenseGroups.value.map((g) => g.group.color || '#999'), borderWidth: 2, borderColor: '#fff' }],
  },
  options: {
    maintainAspectRatio: false, cutout: '64%',
    plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c: any) => `${c.label}: ${money(c.raw)}` } } },
  },
}) as any)

const prevGroups = computed(() => (r.value?.groupRows ?? []).filter((g) => g.group.kind !== 'transferencia' && (g.real || g.prev)))
const prevChart = computed(() => ({
  type: 'bar',
  data: {
    labels: prevGroups.value.map((g) => g.group.name),
    datasets: [
      { label: 'Previsto', data: prevGroups.value.map((g) => g.prev), backgroundColor: '#CFDCCB', borderRadius: 4 },
      { label: 'Realizado', data: prevGroups.value.map((g) => g.real), backgroundColor: getVar('--green'), borderRadius: 4 },
    ],
  },
  options: {
    indexAxis: 'y', maintainAspectRatio: false,
    plugins: { tooltip: { callbacks: { label: (c: any) => `${c.dataset.label}: ${money(c.raw)}` } } },
    scales: { x: { ticks: { callback: (v: any) => moneyShort(v) } }, y: { grid: { display: false } } },
  },
}) as any)

const targets = computed(() => {
  if (!r.value) return []
  const rec = r.value.receita
  return r.value.groupRows
    .filter((g) => g.group.target_pct !== null && g.group.target_pct !== undefined && g.group.kind !== 'receita')
    .map((g) => ({ g: g.group, real: g.real, p: rec ? g.real / rec : null, t: Number(g.group.target_pct) / 100 }))
})

const topCats = computed(() => {
  if (!r.value) return []
  return r.value.groupRows
    .filter((g) => ['despesa', 'retirada'].includes(g.group.kind))
    .flatMap((g) => g.items.map((i) => ({ ...i, color: g.group.color })))
    .filter((i) => i.real > 0).sort((a, b) => b.real - a.real).slice(0, 8)
})
const topMax = computed(() => Math.max(1, ...topCats.value.map((c) => c.real)))

function getVar(n: string) {
  return typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#008C15' : '#008C15'
}
const periodLabel = computed(() => range.value.months.length === 1 ? monthLong(range.value.months[0]) : `${monthLong(range.value.months[0])} a ${monthLong(range.value.months.at(-1)!)}`)
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Painel</h1>
        <p>{{ periodLabel }}</p>
      </div>
      <div class="spacer" />
      <FilterBar />
    </div>

    <div v-if="loading && !r" class="loading-box"><span class="spinner" /> Calculando...</div>

    <template v-if="r">
      <div v-if="r.none.in || r.none.out" class="alert">
        <strong>Há lançamentos sem categoria</strong>
        ({{ money(r.none.in) }} em entradas e {{ money(r.none.out) }} em saídas). Eles ficam fora dos grupos da DRE.
        <NuxtLink to="/lancamentos?uncat=1">Classificar agora</NuxtLink>
      </div>

      <div class="grid g4 kpis" :style="{ opacity: loading ? .6 : 1 }">
        <KpiCard label="Receita" :value="money(r.receita)" :hint="vsPrev(r.receita, r.receitaPrev)" />
        <KpiCard label="Despesas" :value="money(r.despesa)" :hint="vsPrev(r.despesa, r.despesaPrev)" />
        <KpiCard label="Resultado operacional" :value="money(r.operacional)" :tone="r.operacional < 0 ? 'neg' : 'pos'"
          :hint="r.receita ? `Margem de ${pct(r.operacional / r.receita)}` : ''" />
        <KpiCard accent label="Saldo em caixa no fim do período" :value="money(r.closing)" :tone="r.closing < 0 ? 'neg' : 'pos'"
          :hint="`Começou com ${money(r.opening)}`" />
      </div>

      <div class="grid" style="grid-template-columns: 2fr 1fr; margin-top: 16px" :class="{ stack: true }">
        <div class="card">
          <div class="card-title">
            <h3>Entradas, saídas e saldo {{ grain === 'day' ? 'por dia' : 'por mês' }}</h3>
            <span class="small muted">Retiradas {{ money(r.retirada) }}, resultado líquido <b :class="r.liquido < 0 ? 'neg' : 'pos'">{{ money(r.liquido) }}</b></span>
          </div>
          <ChartBox v-if="flowChart" :config="flowChart" :height="300" />
        </div>
        <div class="card">
          <div class="card-title"><h3>Para onde foi o dinheiro</h3></div>
          <ChartBox v-if="expenseGroups.length" :config="donut" :height="300" />
          <div v-else class="empty">Sem despesas no período.</div>
        </div>
      </div>

      <div class="grid g2" style="margin-top: 16px">
        <div class="card">
          <div class="card-title"><h3>Previsto x realizado</h3><NuxtLink to="/previsto" class="small">Ajustar previsto</NuxtLink></div>
          <ChartBox v-if="prevGroups.length" :config="prevChart" :height="Math.max(220, prevGroups.length * 44)" />
          <div v-else class="empty">Sem dados no período.</div>
        </div>
        <div class="card">
          <div class="card-title"><h3>Metas sobre a receita</h3><NuxtLink v-if="app.data.value.isAdmin" to="/cadastros?tab=grupos" class="small">Editar metas</NuxtLink></div>
          <div v-if="!targets.length" class="empty">Defina metas (%) nos grupos em Cadastros.</div>
          <div v-for="t in targets" :key="t.g.id" class="target">
            <div class="row">
              <span class="chip"><span class="dot" :style="{ background: t.g.color }" />{{ t.g.name }}</span>
              <div class="spacer" />
              <b :class="t.p !== null && t.p > t.t ? 'neg' : 'pos'">{{ pct(t.p) }}</b>
              <span class="small muted">meta {{ pct(t.t, 0) }}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: Math.min(100, ((t.p ?? 0) / Math.max(t.t, .0001)) * 100) + '%', background: t.p !== null && t.p > t.t ? 'var(--red)' : 'var(--green)' }" />
            </div>
          </div>

          <h3 style="margin: 22px 0 10px">Maiores despesas</h3>
          <div v-for="c in topCats" :key="c.cat.id" class="topc">
            <span class="topc-name">{{ c.cat.name }}</span>
            <div class="bar-track topc-bar"><div class="bar-fill" :style="{ width: (c.real / topMax) * 100 + '%', background: c.color }" /></div>
            <span class="num small">{{ money(c.real) }}</span>
          </div>
        </div>
      </div>

      <div v-if="multiStore && rankRows.length" class="card" style="margin-top: 16px">
        <div class="card-title">
          <h3>Lojas</h3>
          <div class="row small">
            Ordenar por
            <select v-model="rankSort" style="width: auto">
              <option value="resultado">Resultado</option>
              <option value="receita">Receita</option>
              <option value="margem">Margem</option>
            </select>
          </div>
        </div>
        <div class="table-wrap" style="max-height: 460px; overflow-y: auto">
          <table>
            <thead><tr><th>#</th><th>Loja</th><th class="num">Receita</th><th class="num">Despesas</th><th class="num">Resultado</th><th class="num">Margem</th><th class="num">Retiradas</th></tr></thead>
            <tbody>
              <tr v-for="(x, i) in rankRows" :key="x.id">
                <td class="muted">{{ i + 1 }}</td>
                <td><a href="#" @click.prevent="f.stores = [x.id]">{{ x.name }}</a> <span class="muted small">{{ x.code }}</span></td>
                <td class="num">{{ money(Number(x.receita)) }}</td>
                <td class="num">{{ money(Number(x.despesa)) }}</td>
                <td class="num" :class="Number(x.resultado) < 0 ? 'neg' : 'pos'">{{ money(Number(x.resultado)) }}</td>
                <td class="num">{{ pct(x.margem) }}</td>
                <td class="num">{{ money(Number(x.retirada)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.alert { background: var(--yellow-soft); border-left: 5px solid var(--yellow); padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 16px; }
.alert a { font-weight: 700; margin-left: 6px; }
.target { margin-bottom: 14px; display: grid; gap: 6px; }
.topc { display: grid; grid-template-columns: 170px 1fr 110px; gap: 10px; align-items: center; margin-bottom: 8px; font-size: 14px; }
.topc-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
@media (max-width: 1000px) { .stack { grid-template-columns: 1fr !important; } }
</style>
