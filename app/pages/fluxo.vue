<script setup lang="ts">
import { bucketList, NONE } from '~/utils/report'

const app = useApp()
const { report: r, loading, grain, forced, range } = useReport()
const mode = ref<'resumo' | 'periodo'>('resumo')
const hideZero = ref(true)

const buckets = computed(() => bucketList(range.value.from, range.value.to, grain.value))

type Line = { kind: 'group' | 'cat' | 'none'; label: string; color?: string; id?: string; prev: number; real: number; cols: number[] }

function section(direction: 'entrada' | 'saida') {
  if (!r.value) return { lines: [] as Line[], total: null as any }
  const lines: Line[] = []
  const tot = { prev: 0, real: 0, cols: buckets.value.map(() => 0) }
  for (const g of r.value.groupRows) {
    const items = g.items.filter((i) => i.cat.direction === direction)
    if (!items.length) continue
    const catLines: Line[] = items.map((i) => ({
      kind: 'cat', label: i.cat.name, id: i.cat.id, prev: i.prev, real: i.real,
      cols: buckets.value.map((b) => r.value!.net(i.cat.id, r.value!.buckets[b]?.cats[i.cat.id])),
    }))
    const shown = hideZero.value ? catLines.filter((l) => l.prev || l.real) : catLines
    if (!shown.length) continue
    const gl: Line = {
      kind: 'group', label: g.group.name, color: g.group.color,
      prev: catLines.reduce((s, l) => s + l.prev, 0), real: catLines.reduce((s, l) => s + l.real, 0),
      cols: buckets.value.map((_, k) => catLines.reduce((s, l) => s + l.cols[k], 0)),
    }
    lines.push(gl, ...shown)
    tot.prev += gl.prev; tot.real += gl.real; gl.cols.forEach((v, k) => (tot.cols[k] += v))
  }
  const none = direction === 'entrada' ? r.value.none.in : r.value.none.out
  if (none) {
    const cols = buckets.value.map((b) => {
      const x = r.value!.buckets[b]?.cats[NONE]
      return x ? (direction === 'entrada' ? x.in : x.out) : 0
    })
    lines.push({ kind: 'none', label: 'Sem categoria', prev: 0, real: none, cols })
    tot.real += none; cols.forEach((v, k) => (tot.cols[k] += v))
  }
  return { lines, total: tot }
}

const ent = computed(() => section('entrada'))
const sai = computed(() => section('saida'))
const diff = computed(() => ({
  prev: (ent.value.total?.prev ?? 0) - (sai.value.total?.prev ?? 0),
  real: (ent.value.total?.real ?? 0) - (sai.value.total?.real ?? 0),
  cols: buckets.value.map((_, k) => (ent.value.total?.cols[k] ?? 0) - (sai.value.total?.cols[k] ?? 0)),
}))
const balances = computed(() => {
  let s = r.value?.opening ?? 0
  return diff.value.cols.map((v) => (s += v))
})
const sections = computed(() => [
  { title: 'Entradas', sec: ent.value, sign: 1 },
  { title: 'Saídas', sec: sai.value, sign: -1 },
])
const receitaReal = computed(() => r.value?.receita || 0)
const share = (v: number) => (receitaReal.value ? v / receitaReal.value : null)
const colLabel = (b: string) => (grain.value === 'day' ? dayLabel(b) : monthLabel(b))

function exportCsv() {
  const head = mode.value === 'resumo'
    ? ['Descrição', 'Previsto', 'Realizado', 'Variação', '% receita']
    : ['Descrição', ...buckets.value.map(colLabel), 'Total']
  const rows: any[][] = [head]
  const push = (label: string, l: { prev: number; real: number; cols: number[] }) => rows.push(
    mode.value === 'resumo' ? [label, l.prev, l.real, l.real - l.prev, share(l.real) === null ? '' : (share(l.real)! * 100).toFixed(1) + '%'] : [label, ...l.cols, l.real])
  rows.push(['ENTRADAS']); ent.value.lines.forEach((l) => push(l.kind === 'cat' ? '   ' + l.label : l.label, l))
  if (ent.value.total) push('TOTAL DE ENTRADAS', ent.value.total)
  rows.push(['SAÍDAS']); sai.value.lines.forEach((l) => push(l.kind === 'cat' ? '   ' + l.label : l.label, l))
  if (sai.value.total) push('TOTAL DE SAÍDAS', sai.value.total)
  push('DIFERENÇA (E - S)', diff.value)
  csvDownload(`fluxo-de-caixa-${range.value.from.slice(0, 7)}.csv`, rows)
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Fluxo de caixa</h1>
        <p>Entradas e saídas por categoria, com previsto e realizado.</p>
      </div>
      <div class="spacer" />
      <FilterBar />
    </div>

    <div class="card">
      <div class="row" style="margin-bottom: 14px">
        <div class="tabs" style="margin: 0; border: 0">
          <button :class="{ on: mode === 'resumo' }" @click="mode = 'resumo'">Previsto x realizado</button>
          <button :class="{ on: mode === 'periodo' }" @click="mode = 'periodo'">{{ grain === 'day' ? 'Dia a dia' : 'Mês a mês' }}</button>
        </div>
        <select v-if="mode === 'periodo'" v-model="forced" style="width: auto">
          <option value="auto">Agrupar automático</option>
          <option value="day">Por dia</option>
          <option value="month">Por mês</option>
        </select>
        <label class="row small" style="gap: 6px"><input v-model="hideZero" type="checkbox"> Ocultar linhas zeradas</label>
        <div class="spacer" />
        <button class="btn ghost sm" :disabled="!r" @click="exportCsv">Baixar planilha (CSV)</button>
      </div>

      <div v-if="loading && !r" class="loading-box"><span class="spinner" /> Calculando...</div>

      <div v-if="r" class="table-wrap" :style="{ opacity: loading ? .5 : 1 }">
        <table class="fx">
          <thead>
            <tr>
              <th class="sticky-col" style="min-width: 240px">Descrição</th>
              <template v-if="mode === 'resumo'">
                <th class="num">Previsto</th><th class="num">Realizado</th><th class="num">Variação</th><th class="num">% receita</th>
              </template>
              <template v-else>
                <th v-for="b in buckets" :key="b" class="num">{{ colLabel(b) }}</th>
                <th class="num">Total</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr class="result-row"><td class="sticky-col" colspan="1">Saldo inicial</td>
              <td v-if="mode === 'resumo'" colspan="4" class="num">{{ money(r.opening) }}</td>
              <template v-else><td v-for="(b, k) in buckets" :key="b" class="num small">{{ money(k === 0 ? r.opening : balances[k - 1]) }}</td><td /></template>
            </tr>

            <template v-for="{ title, sec, sign } in sections" :key="title">
              <tr><td class="sticky-col sec-title" :colspan="mode === 'resumo' ? 5 : buckets.length + 2">{{ title }}</td></tr>
              <tr v-for="(l, i) in sec.lines" :key="title + i" :class="{ 'group-row': l.kind === 'group' }">
                <td class="sticky-col" :style="{ paddingLeft: l.kind === 'cat' ? '28px' : '12px' }">
                  <span class="chip"><span v-if="l.color" class="dot" :style="{ background: l.color }" />{{ l.label }}</span>
                  <span v-if="l.kind === 'none'" class="badge warn">classificar</span>
                </td>
                <template v-if="mode === 'resumo'">
                  <td class="num">{{ money(l.prev) }}</td>
                  <td class="num">{{ money(l.real) }}</td>
                  <td class="num" :class="(l.real - l.prev) * sign >= 0 ? 'pos' : 'neg'">{{ l.prev ? money(l.real - l.prev) : '' }}</td>
                  <td class="num muted">{{ pct(share(l.real)) }}</td>
                </template>
                <template v-else>
                  <td v-for="(v, k) in l.cols" :key="k" class="num small">{{ v ? number2(v) : '' }}</td>
                  <td class="num"><b>{{ money(l.real) }}</b></td>
                </template>
              </tr>
              <tr v-if="sec.total" class="total-row">
                <td class="sticky-col">Total de {{ title.toLowerCase() }}</td>
                <template v-if="mode === 'resumo'">
                  <td class="num">{{ money(sec.total.prev) }}</td><td class="num">{{ money(sec.total.real) }}</td>
                  <td class="num">{{ money(sec.total.real - sec.total.prev) }}</td><td class="num">{{ pct(share(sec.total.real)) }}</td>
                </template>
                <template v-else>
                  <td v-for="(v, k) in sec.total.cols" :key="k" class="num small">{{ number2(v) }}</td>
                  <td class="num">{{ money(sec.total.real) }}</td>
                </template>
              </tr>
            </template>

            <tr class="result-row">
              <td class="sticky-col">Diferença (entradas − saídas)</td>
              <template v-if="mode === 'resumo'">
                <td class="num">{{ money(diff.prev) }}</td>
                <td class="num" :class="diff.real < 0 ? 'neg' : 'pos'">{{ money(diff.real) }}</td>
                <td class="num">{{ money(diff.real - diff.prev) }}</td><td />
              </template>
              <template v-else>
                <td v-for="(v, k) in diff.cols" :key="k" class="num small" :class="v < 0 ? 'neg' : ''">{{ number2(v) }}</td>
                <td class="num" :class="diff.real < 0 ? 'neg' : 'pos'">{{ money(diff.real) }}</td>
              </template>
            </tr>
            <tr class="result-row">
              <td class="sticky-col">Saldo final</td>
              <td v-if="mode === 'resumo'" colspan="4" class="num" :class="r.closing < 0 ? 'neg' : 'pos'">{{ money(r.closing) }}</td>
              <template v-else>
                <td v-for="(v, k) in balances" :key="k" class="num small" :class="v < 0 ? 'neg' : ''">{{ number2(v) }}</td>
                <td class="num" :class="r.closing < 0 ? 'neg' : 'pos'">{{ money(r.closing) }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sec-title { font-family: var(--display); font-size: 19px; font-weight: 700; padding-top: 18px; color: var(--green-dark); border-bottom: 2px solid var(--yellow); }
.fx tr.group-row td { background: var(--green-soft); }
.fx tr.result-row td { background: var(--yellow-soft); }
</style>
