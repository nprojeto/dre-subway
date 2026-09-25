/**
 * Transforma os totais do servidor em números prontos para
 * dashboard, fluxo de caixa e DRE.
 */
export type Flow = { in: number; out: number }
export type Raw = { totals: { b: string; c: string | null; d: string; v: number }[]; budget: { c: string; v: number }[]; opening: number }

export const NONE = '__none'

export function buildReport(raw: Raw, catMap: Record<string, any>, groups: any[]) {
  const cats: Record<string, Flow> = {}
  const buckets: Record<string, Flow & { cats: Record<string, Flow> }> = {}
  let totIn = 0, totOut = 0

  for (const r of raw.totals || []) {
    const key = r.c && catMap[r.c] ? r.c : NONE
    const v = Number(r.v) || 0
    cats[key] ??= { in: 0, out: 0 }
    buckets[r.b] ??= { in: 0, out: 0, cats: {} }
    buckets[r.b].cats[key] ??= { in: 0, out: 0 }
    if (r.d === 'entrada') { cats[key].in += v; buckets[r.b].in += v; buckets[r.b].cats[key].in += v; totIn += v }
    else { cats[key].out += v; buckets[r.b].out += v; buckets[r.b].cats[key].out += v; totOut += v }
  }

  const budget: Record<string, number> = {}
  for (const b of raw.budget || []) budget[b.c] = Number(b.v) || 0

  /** valor "natural" da categoria (receita positiva, despesa positiva) */
  const net = (id: string, f?: Flow) => {
    const x = f ?? cats[id]
    if (!x) return 0
    const c = catMap[id]
    return c?.direction === 'entrada' ? x.in - x.out : x.out - x.in
  }

  const groupRows = [...groups]
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    .map((g) => {
      const items = Object.values(catMap)
        .filter((c: any) => c.group_id === g.id)
        .sort((a: any, b: any) => a.sort - b.sort || a.name.localeCompare(b.name))
        .map((c: any) => ({ cat: c, real: net(c.id), prev: budget[c.id] ?? 0 }))
      return {
        group: g,
        items,
        real: items.reduce((s, i) => s + i.real, 0),
        prev: items.reduce((s, i) => s + i.prev, 0),
      }
    })

  const sumKind = (k: string, field: 'real' | 'prev') =>
    groupRows.filter((g) => g.group.kind === k).reduce((s, g) => s + g[field], 0)

  const none = cats[NONE] ?? { in: 0, out: 0 }
  const receita = sumKind('receita', 'real')
  const despesa = sumKind('despesa', 'real')
  const retirada = sumKind('retirada', 'real')
  const operacional = receita - despesa + (none.in - none.out)
  const liquido = operacional - retirada

  const receitaPrev = sumKind('receita', 'prev')
  const despesaPrev = sumKind('despesa', 'prev')
  const retiradaPrev = sumKind('retirada', 'prev')

  const opening = Number(raw.opening) || 0
  return {
    cats, buckets, budget, groupRows, none, net,
    totIn, totOut, opening, closing: opening + totIn - totOut,
    receita, despesa, retirada, operacional, liquido,
    receitaPrev, despesaPrev, retiradaPrev,
    operacionalPrev: receitaPrev - despesaPrev,
    liquidoPrev: receitaPrev - despesaPrev - retiradaPrev,
  }
}

export type Report = ReturnType<typeof buildReport>

/** Lista de dias ou meses do período */
export function bucketList(from: string, to: string, grain: 'day' | 'month') {
  const out: string[] = []
  const d = new Date(from + 'T12:00:00')
  const end = new Date(to + 'T12:00:00')
  if (grain === 'month') d.setDate(1)
  while (d <= end && out.length < 800) {
    out.push(d.toISOString().slice(0, 10))
    grain === 'day' ? d.setDate(d.getDate() + 1) : d.setMonth(d.getMonth() + 1)
  }
  return out
}
