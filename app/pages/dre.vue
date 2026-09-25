<script setup lang="ts">
const { report: r, loading, range } = useReport({ grain: 'month' })
const open = ref<Set<string>>(new Set())
const expandAll = ref(false)
const toggle = (id: string) => { const s = new Set(open.value); s.has(id) ? s.delete(id) : s.add(id); open.value = s }
const isOpen = (id: string) => expandAll.value || open.value.has(id)

const byKind = (k: string) => (r.value?.groupRows ?? []).filter((g) => g.group.kind === k)
const rec = computed(() => r.value?.receita || 0)
const recPrev = computed(() => r.value?.receitaPrev || 0)
const p = (v: number, base: number) => (base ? v / base : null)
const noneNet = computed(() => (r.value ? r.value.none.in - r.value.none.out : 0))

function exportCsv() {
  if (!r.value) return
  const rows: any[][] = [['Descrição', 'Previsto', '% prev.', 'Realizado', '% receita', 'Meta %', 'Variação']]
  const line = (label: string, prev: number, real: number, meta: any = '') =>
    rows.push([label, prev, recPrev.value ? (prev / recPrev.value * 100).toFixed(1) + '%' : '', real, rec.value ? (real / rec.value * 100).toFixed(1) + '%' : '', meta, real - prev])
  const groups = (k: string, prefix: string) => byKind(k).forEach((g) => {
    line(`${prefix} ${g.group.name}`, g.prev, g.real, g.group.target_pct ?? '')
    g.items.forEach((i) => (i.prev || i.real) && line(`      ${i.cat.name}`, i.prev, i.real))
  })
  groups('receita', '(+)')
  line('RECEITA TOTAL', r.value.receitaPrev, r.value.receita)
  groups('despesa', '(−)')
  if (noneNet.value) line('Sem categoria', 0, noneNet.value)
  line('RESULTADO OPERACIONAL', r.value.operacionalPrev, r.value.operacional)
  groups('retirada', '(−)')
  line('RESULTADO LÍQUIDO', r.value.liquidoPrev, r.value.liquido)
  csvDownload(`dre-${range.value.from.slice(0, 7)}.csv`, rows)
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>DRE</h1>
        <p>Resultado do período por grupo, em valor e percentual sobre a receita.</p>
      </div>
      <div class="spacer" />
      <FilterBar />
    </div>

    <div class="card">
      <div class="row" style="margin-bottom: 12px">
        <label class="row small" style="gap: 6px"><input v-model="expandAll" type="checkbox"> Mostrar categorias</label>
        <div class="spacer" />
        <button class="btn ghost sm" :disabled="!r" @click="exportCsv">Baixar planilha (CSV)</button>
      </div>

      <div v-if="loading && !r" class="loading-box"><span class="spinner" /> Calculando...</div>
      <div v-if="r" class="table-wrap" :style="{ opacity: loading ? .5 : 1 }">
        <table>
          <thead>
            <tr>
              <th style="min-width: 260px">Descrição</th>
              <th class="num">Previsto</th><th class="num">% prev.</th>
              <th class="num">Realizado</th><th class="num">% receita</th>
              <th class="num">Meta</th><th class="num">Variação</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(sec, si) in [
              { kind: 'receita', sign: '+', after: { label: 'Receita total', prev: r.receitaPrev, real: r.receita } },
              { kind: 'despesa', sign: '−', after: { label: 'Resultado operacional', prev: r.operacionalPrev, real: r.operacional } },
              { kind: 'retirada', sign: '−', after: { label: 'Resultado líquido', prev: r.liquidoPrev, real: r.liquido } },
            ]" :key="si">
              <template v-for="g in byKind(sec.kind)" :key="g.group.id">
                <tr class="grp" @click="toggle(g.group.id)">
                  <td>
                    <span class="chip">
                      <span class="caret" :class="{ on: isOpen(g.group.id) }">›</span>
                      <span class="dot" :style="{ background: g.group.color }" />
                      ({{ sec.sign }}) {{ g.group.name }}
                    </span>
                  </td>
                  <td class="num">{{ money(g.prev) }}</td>
                  <td class="num muted">{{ pct(p(g.prev, recPrev)) }}</td>
                  <td class="num"><b>{{ money(g.real) }}</b></td>
                  <td class="num">
                    <b :class="g.group.target_pct != null && sec.kind !== 'receita' && (p(g.real, rec) ?? 0) * 100 > g.group.target_pct ? 'neg' : ''">{{ pct(p(g.real, rec)) }}</b>
                  </td>
                  <td class="num muted">{{ g.group.target_pct != null ? pct(g.group.target_pct / 100, 0) : '' }}</td>
                  <td class="num" :class="(sec.kind === 'receita' ? g.real - g.prev : g.prev - g.real) >= 0 ? 'pos' : 'neg'">{{ money(g.real - g.prev) }}</td>
                </tr>
                <template v-if="isOpen(g.group.id)">
                  <tr v-for="i in g.items.filter((x) => x.prev || x.real)" :key="i.cat.id" class="sub">
                    <td style="padding-left: 46px">{{ i.cat.name }}</td>
                    <td class="num">{{ money(i.prev) }}</td>
                    <td class="num muted">{{ pct(p(i.prev, recPrev)) }}</td>
                    <td class="num">{{ money(i.real) }}</td>
                    <td class="num muted">{{ pct(p(i.real, rec)) }}</td>
                    <td />
                    <td class="num muted">{{ money(i.real - i.prev) }}</td>
                  </tr>
                </template>
              </template>
              <tr v-if="sec.kind === 'despesa' && noneNet" class="sub">
                <td><span class="badge warn">Sem categoria</span> <NuxtLink to="/lancamentos?uncat=1" class="small">classificar</NuxtLink></td>
                <td /><td /><td class="num">{{ money(noneNet) }}</td><td class="num muted">{{ pct(p(noneNet, rec)) }}</td><td /><td />
              </tr>
              <tr class="result-row">
                <td>{{ sec.after.label }}</td>
                <td class="num">{{ money(sec.after.prev) }}</td>
                <td class="num">{{ si ? pct(p(sec.after.prev, recPrev)) : '' }}</td>
                <td class="num" :class="sec.after.real < 0 ? 'neg' : ''">{{ money(sec.after.real) }}</td>
                <td class="num">{{ si ? pct(p(sec.after.real, rec)) : '' }}</td>
                <td />
                <td class="num" :class="sec.after.real - sec.after.prev >= 0 ? 'pos' : 'neg'">{{ money(sec.after.real - sec.after.prev) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p class="small muted" style="margin-top: 12px">
        Transferências entre contas não entram na DRE. Grupos, categorias e metas podem ser alterados em Cadastros.
      </p>
    </div>
  </div>
</template>

<style scoped>
.grp { cursor: pointer; }
.grp td { font-weight: 600; }
.caret { display: inline-block; width: 12px; transition: transform .15s; color: var(--muted); font-weight: 700; }
.caret.on { transform: rotate(90deg); }
.sub td { font-size: 13.5px; color: var(--muted); }
</style>
