<script setup lang="ts">
/** Filtros globais: lojas, contas e período. */
const props = defineProps<{ hideAccounts?: boolean; hidePeriod?: boolean }>()
const { f, preset } = useFilters()
const app = useApp()

const storeOpts = computed(() =>
  app.data.value.stores.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name, sub: s.code ?? '' })))
const accountOpts = computed(() => {
  const st = new Set(f.value.stores)
  return app.data.value.accounts
    .filter((a) => !st.size || st.has(a.store_id))
    .map((a) => ({ value: a.id, label: a.name, sub: app.storeMap.value[a.store_id]?.name ?? '' }))
})
watch(() => f.value.stores, () => {
  const ok = new Set(accountOpts.value.map((o) => o.value))
  f.value.accounts = f.value.accounts.filter((a) => ok.has(a))
})
const showStores = computed(() => app.data.value.stores.length > 1)
const presetSel = ref('')
watch(presetSel, (v) => { if (v) { preset(v); presetSel.value = '' } })
</script>

<template>
  <div class="fb">
    <MultiSelect v-if="showStores" v-model="f.stores" :options="storeOpts" all-label="Todas as lojas" placeholder="Buscar loja ou código" />
    <MultiSelect v-if="!props.hideAccounts" v-model="f.accounts" :options="accountOpts" all-label="Todas as contas" placeholder="Buscar conta" />
    <template v-if="!props.hidePeriod">
      <input v-model="f.from" type="month" aria-label="Mês inicial" class="fb-month">
      <span class="muted">até</span>
      <input v-model="f.to" type="month" aria-label="Mês final" class="fb-month">
      <select v-model="presetSel" class="fb-preset" aria-label="Atalhos de período">
        <option value="">Atalhos</option>
        <option value="mes">Este mês</option>
        <option value="anterior">Mês passado</option>
        <option value="tri">Últimos 3 meses</option>
        <option value="ano">Este ano</option>
        <option value="12m">Últimos 12 meses</option>
      </select>
    </template>
  </div>
</template>

<style scoped>
.fb { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.fb-month { width: 150px; }
.fb-preset { width: 120px; }
</style>
