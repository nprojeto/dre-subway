const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlShort = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const num = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const money = (v: number | null | undefined) => (v === null || v === undefined || isNaN(v) ? '—' : brl.format(v))
export const moneyShort = (v: number) => 'R$ ' + brlShort.format(v)
export const number2 = (v: number | null | undefined) => (v === null || v === undefined ? '' : num.format(v))
export const pct = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined || !isFinite(v) ? '—' : `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`
export const dateBR = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '')
export const dayLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
export const monthLabel = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]}/${d.slice(2, 4)}`
export const monthLong = (ym: string) => {
  const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${names[Number(ym.slice(5, 7)) - 1]} de ${ym.slice(0, 4)}`
}
export const today = () => new Date().toISOString().slice(0, 10)
export const ymNow = () => today().slice(0, 7)
export const lastDay = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}
export const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
/** Converte "1.234,56" ou "1234.56" em número */
export const parseMoney = (s: any) => {
  if (typeof s === 'number') return s
  const t = String(s ?? '').trim().replace(/[R$\s]/g, '')
  if (!t) return NaN
  return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
}
export const csvDownload = (name: string, rows: (string | number | null)[][]) => {
  const txt = rows.map((r) => r.map((c) => {
    const v = typeof c === 'number' ? c.toFixed(2).replace('.', ',') : (c ?? '')
    return /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v
  }).join(';')).join('\n')
  const blob = new Blob(['\ufeff' + txt], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
