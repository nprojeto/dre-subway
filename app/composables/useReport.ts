import { buildReport, type Report } from '~/utils/report'

/** Busca os totais do período filtrado e monta o relatório. */
export const useReport = (opts: { grain?: 'auto' | 'day' | 'month' } = {}) => {
  const { f, range } = useFilters()
  const app = useApp()
  const api = useApi()
  const toast = useToast()
  const report = ref<Report | null>(null)
  const loading = ref(false)
  const forced = ref<'auto' | 'day' | 'month'>(opts.grain ?? 'auto')
  const grain = computed<'day' | 'month'>(() =>
    forced.value !== 'auto' ? forced.value : range.value.months.length > 2 ? 'month' : 'day')

  let seq = 0
  const load = async () => {
    const my = ++seq
    loading.value = true
    try {
      const raw = await api.post('/report', {
        store_ids: f.value.stores, account_ids: f.value.accounts,
        from: range.value.from, to: range.value.to, grain: grain.value,
      })
      if (my === seq) report.value = buildReport(raw, app.catMap.value, app.data.value.groups)
    } catch (e: any) {
      if (my === seq) toast.bad(e)
    } finally {
      if (my === seq) loading.value = false
    }
  }

  watch(() => [f.value.stores, f.value.accounts, range.value.from, range.value.to, grain.value], load, { deep: true })
  onMounted(load)

  return { report, loading, grain, forced, load, range }
}
