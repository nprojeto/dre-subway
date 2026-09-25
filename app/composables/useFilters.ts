import { addMonths, lastDay, ymNow } from './useFmt'

type Filters = { stores: string[]; accounts: string[]; from: string; to: string }
const KEY = 'fluxo-filtros'

/** Filtro global (lojas, contas e período) usado em todas as telas. */
export const useFilters = () => {
  const f = useState<Filters>('filters', () => {
    const base = { stores: [], accounts: [], from: ymNow(), to: ymNow() }
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
      if (saved?.from) return { ...base, ...saved }
    } catch {}
    return base
  })

  watch(f, (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch {} }, { deep: true })

  const range = computed(() => {
    const from = f.value.from <= f.value.to ? f.value.from : f.value.to
    const to = f.value.from <= f.value.to ? f.value.to : f.value.from
    return { from: `${from}-01`, to: lastDay(to), months: monthsBetween(from, to) }
  })

  const preset = (k: string) => {
    const now = ymNow()
    if (k === 'mes') { f.value.from = now; f.value.to = now }
    if (k === 'anterior') { f.value.from = addMonths(now, -1); f.value.to = addMonths(now, -1) }
    if (k === 'tri') { f.value.from = addMonths(now, -2); f.value.to = now }
    if (k === 'ano') { f.value.from = `${now.slice(0, 4)}-01`; f.value.to = now }
    if (k === '12m') { f.value.from = addMonths(now, -11); f.value.to = now }
  }

  return { f, range, preset }
}

function monthsBetween(a: string, b: string) {
  const out: string[] = []
  let m = a
  while (m <= b && out.length < 120) { out.push(m); m = addMonths(m, 1) }
  return out
}
