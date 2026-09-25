<script setup lang="ts">
import { Chart, type ChartConfiguration } from 'chart.js'

/** Gráfico genérico (Chart.js). Atualiza sozinho quando os dados mudam. */
const props = defineProps<{ config: ChartConfiguration; height?: number }>()
const canvas = ref<HTMLCanvasElement>()
let chart: Chart | null = null

const plain = () => ({
  type: props.config.type,
  data: JSON.parse(JSON.stringify(toRaw(props.config.data))),
  options: toRaw(props.config.options) as any,
})

const draw = () => {
  if (!canvas.value) return
  const cfg = plain()
  if (chart && (chart.config as any).type === cfg.type) {
    chart.data = cfg.data
    chart.options = cfg.options
    chart.update()
    return
  }
  chart?.destroy()
  chart = new Chart(canvas.value, cfg as any)
}
onMounted(draw)
watch(() => props.config, draw, { deep: true })
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <div class="cb" :style="{ height: (height ?? 280) + 'px' }"><canvas ref="canvas" /></div>
</template>

<style scoped>
.cb { position: relative; width: 100%; }
</style>
