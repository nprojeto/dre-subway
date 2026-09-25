<script setup lang="ts">
const app = useApp()
const api = useApi()
const toast = useToast()
const { f, range } = useFilters()
const rows = ref<any[]>([])
const loading = ref(false)
const onlyIssues = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await api.post('/reconciliation', { store_ids: f.value.stores, from: range.value.from, to: range.value.to })
    rows.value = data.map((x: any) => {
      const calc = Number(x.saldo_inicial) + Number(x.entradas) - Number(x.saidas)
      return { ...x, calc, input: x.saldo_banco === null ? '' : number2(Number(x.saldo_banco)) }
    })
  } catch (e: any) { toast.bad(e) } finally { loading.value = false }
}
watch(() => [f.value.stores, range.value.from, range.value.to], load, { deep: true })
onMounted(load)

const diff = (x: any) => (x.saldo_banco === null ? null : Math.round((Number(x.saldo_banco) - x.calc) * 100) / 100)
const shown = computed(() => rows.value.filter((x) => !onlyIssues.value || diff(x) !== 0))
const summary = computed(() => ({
  ok: rows.value.filter((x) => diff(x) === 0).length,
  bad: rows.value.filter((x) => diff(x) !== null && diff(x) !== 0).length,
  pending: rows.value.filter((x) => diff(x) === null).length,
}))

async function saveBalance(x: any) {
  const v = x.input === '' ? null : parseMoney(x.input)
  if (v !== null && isNaN(v)) return toast.bad('Valor inválido.')
  if (v === (x.saldo_banco === null ? null : Number(x.saldo_banco))) return
  try {
    await api.post('/balances', { account_id: x.account_id, date: range.value.to, balance: v })
    x.saldo_banco = v
    x.saldo_banco_data = v === null ? null : range.value.to
  } catch (e: any) { toast.bad(e) }
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Conciliação bancária</h1>
        <p>Compare o saldo calculado pelo sistema com o saldo do extrato em {{ dateBR(range.to) }}.</p>
      </div>
      <div class="spacer" />
      <FilterBar hide-accounts />
    </div>

    <div class="grid g3" style="margin-bottom: 16px">
      <KpiCard label="Contas que conferem" :value="String(summary.ok)" tone="pos" />
      <KpiCard label="Contas com diferença" :value="String(summary.bad)" :tone="summary.bad ? 'neg' : ''" />
      <KpiCard label="Sem saldo do banco" :value="String(summary.pending)" hint="Informe o saldo do extrato ou importe o PDF" />
    </div>

    <div class="card">
      <div class="row" style="margin-bottom: 12px">
        <label class="row small" style="gap: 6px"><input v-model="onlyIssues" type="checkbox"> Mostrar só pendências</label>
      </div>
      <div v-if="loading && !rows.length" class="loading-box"><span class="spinner" /> Carregando...</div>
      <div class="table-wrap" :style="{ opacity: loading ? .5 : 1 }">
        <table>
          <thead>
            <tr>
              <th v-if="app.data.value.stores.length > 1">Loja</th><th>Conta</th>
              <th class="num">Saldo inicial</th><th class="num">Entradas</th><th class="num">Saídas</th>
              <th class="num">Saldo no sistema</th><th class="num" style="min-width: 150px">Saldo no banco</th>
              <th class="num">Diferença</th><th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="x in shown" :key="x.account_id">
              <td v-if="app.data.value.stores.length > 1">{{ x.store_name }}</td>
              <td>{{ x.account_name }}<div class="small muted">{{ x.bank_name }}</div></td>
              <td class="num">{{ money(Number(x.saldo_inicial)) }}</td>
              <td class="num pos">{{ money(Number(x.entradas)) }}</td>
              <td class="num neg">{{ money(Number(x.saidas)) }}</td>
              <td class="num"><b>{{ money(x.calc) }}</b></td>
              <td class="num">
                <input v-model="x.input" inputmode="decimal" placeholder="0,00" style="text-align: right" :disabled="!app.data.value.canWrite" @blur="saveBalance(x)" @keyup.enter="($event.target as HTMLInputElement).blur()">
                <div v-if="x.saldo_banco_data && x.saldo_banco_data !== range.to" class="small muted">em {{ dateBR(x.saldo_banco_data) }}</div>
              </td>
              <td class="num" :class="diff(x) ? 'neg' : 'pos'">{{ diff(x) === null ? '' : money(diff(x)) }}</td>
              <td>
                <span v-if="diff(x) === null" class="badge">Pendente</span>
                <span v-else-if="diff(x) === 0" class="badge ok">Confere</span>
                <span v-else class="badge bad">Verificar</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!shown.length && !loading" class="empty"><h3>Nenhuma conta</h3><p>Cadastre contas em Cadastros.</p></div>
      </div>
      <p class="small muted" style="margin-top: 12px">
        Diferença costuma indicar lançamento faltando, duplicado ou saldo inicial da conta errado (Cadastros > Contas).
      </p>
    </div>
  </div>
</template>
