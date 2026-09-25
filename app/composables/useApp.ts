type AppData = {
  loaded: boolean
  profile: any
  isAdmin: boolean
  canWrite: boolean
  stores: any[]
  accounts: any[]
  banks: any[]
  groups: any[]
  categories: any[]
  settings: Record<string, any>
}

const empty = (): AppData => ({
  loaded: false, profile: null, isAdmin: false, canWrite: false,
  stores: [], accounts: [], banks: [], groups: [], categories: [], settings: {},
})

export const applyTheme = (settings: Record<string, any>) => {
  if (typeof document === 'undefined') return
  const t = settings?.tema || {}
  const r = document.documentElement.style
  if (t.primary) r.setProperty('--green', t.primary)
  if (t.secondary) r.setProperty('--yellow', t.secondary)
  if (t.dark) r.setProperty('--green-dark', t.dark)
  if (settings?.app?.name) document.title = settings.app.name
}

/** Dados de apoio (lojas, contas, categorias...) carregados uma vez. */
export const useApp = () => {
  const data = useState<AppData>('app', empty)

  const load = async () => {
    const r = await useApi().get('/bootstrap')
    data.value = { ...r, loaded: true }
    applyTheme(r.settings)
  }
  const reset = () => (data.value = empty())

  const by = (list: any[]) => Object.fromEntries(list.map((x) => [x.id, x]))
  const storeMap = computed(() => by(data.value.stores))
  const accountMap = computed(() => by(data.value.accounts))
  const bankMap = computed(() => by(data.value.banks))
  const groupMap = computed(() => by(data.value.groups))
  const catMap = computed(() => by(data.value.categories))

  const groupsSorted = computed(() => [...data.value.groups].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)))
  const catsOfGroup = (gid: string) =>
    data.value.categories.filter((c) => c.group_id === gid).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))

  /** Opções de categoria agrupadas para <select> */
  const catOptions = (direction?: string, onlyActive = true) =>
    groupsSorted.value
      .filter((g) => !onlyActive || g.active)
      .map((g) => ({
        group: g.name,
        items: catsOfGroup(g.id).filter((c) => (!direction || c.direction === direction) && (!onlyActive || c.active)),
      }))
      .filter((g) => g.items.length)

  const accountLabel = (id: string) => {
    const a = accountMap.value[id]
    if (!a) return '—'
    return a.name
  }

  return { data, load, reset, storeMap, accountMap, bankMap, groupMap, catMap, groupsSorted, catsOfGroup, catOptions, accountLabel }
}
