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
