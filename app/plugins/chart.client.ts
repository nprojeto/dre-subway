import { Chart, registerables } from 'chart.js'

export default defineNuxtPlugin(() => {
  Chart.register(...registerables)
  Chart.defaults.font.family = "'Barlow', system-ui, sans-serif"
  Chart.defaults.font.size = 12
  Chart.defaults.color = '#5B6B60'
  Chart.defaults.plugins.legend.labels.usePointStyle = true
  Chart.defaults.plugins.legend.labels.boxWidth = 8
  Chart.defaults.plugins.tooltip.backgroundColor = '#00391A'
  Chart.defaults.plugins.tooltip.padding = 10
  Chart.defaults.plugins.tooltip.cornerRadius = 8
})

/** Escreve a porcentagem dentro de cada fatia (gráficos de rosca). Ligar com options.plugins.sliceLabels.display = true */
Chart.register({
  id: 'sliceLabels',
  afterDatasetsDraw(chart: any, _args: any, opts: any) {
    if (!opts?.display) return
    const ds = chart.data.datasets[0]
    const meta = chart.getDatasetMeta(0)
    const total = (ds?.data ?? []).reduce((s: number, v: number) => s + (Number(v) || 0), 0)
    if (!total) return
    const ctx = chart.ctx
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = "700 13px 'Barlow', system-ui, sans-serif"
    meta.data.forEach((arc: any, i: number) => {
      if (arc.hidden || !chart.getDataVisibility(i)) return
      const p = (Number(ds.data[i]) || 0) / total
      if (p < 0.03) return
      const { x, y } = arc.tooltipPosition()
      const txt = (p * 100).toFixed(2).replace('.', ',') + '%'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(0,0,0,.45)'
      ctx.strokeText(txt, x, y)
      ctx.fillStyle = '#fff'
      ctx.fillText(txt, x, y)
    })
    ctx.restore()
  },
})
