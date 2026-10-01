<script setup lang="ts">
/** Alterna entre os logos com transição suave. */
const props = defineProps<{ extra?: string | null; height?: number; interval?: number }>()
const base = useRuntimeConfig().app.baseURL
const list = computed(() => [props.extra, `${base}logo-sw.svg`, `${base}logo-s.png`].filter(Boolean) as string[])
const i = ref(0)
let t: any
onMounted(() => { t = setInterval(() => (i.value = (i.value + 1) % list.value.length), props.interval ?? 5000) })
onBeforeUnmount(() => clearInterval(t))
</script>

<template>
  <div class="lr" :style="{ height: (height ?? 64) + 'px' }">
    <img v-for="(src, k) in list" :key="src" :src="src" alt="Logo" :class="{ on: k === i }">
  </div>
</template>

<style scoped>
.lr { position: relative; width: 100%; }
.lr img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity .8s ease; }
.lr img.on { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .lr img { transition: none; } }
</style>
