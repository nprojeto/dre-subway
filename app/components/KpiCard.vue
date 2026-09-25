<script setup lang="ts">
defineProps<{ label: string; value: string; hint?: string; tone?: 'pos' | 'neg' | ''; accent?: boolean }>()
</script>

<template>
  <div class="kpi" :class="{ accent }">
    <span class="kpi-label">{{ label }}</span>
    <strong class="kpi-value" :class="tone">{{ value }}</strong>
    <span v-if="hint" class="kpi-hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.kpi { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px 18px; display: flex; flex-direction: column; gap: 2px; border-top: 4px solid var(--green); }
.kpi.accent { background: var(--green-dark); color: #fff; border-top-color: var(--yellow); }
.kpi-label { font-size: 13px; font-weight: 600; color: var(--muted); }
.kpi.accent .kpi-label, .kpi.accent .kpi-hint { color: rgba(255,255,255,.75); }
.kpi-value { font-family: var(--display); font-size: clamp(22px, 2vw, 30px); font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums; }
.kpi.accent .kpi-value.neg { color: #FF9C9C; }
.kpi.accent .kpi-value.pos { color: var(--yellow); }
.kpi-hint { font-size: 13px; color: var(--muted); }
</style>
