<script setup lang="ts">
const { list } = useToast()
</script>

<template>
  <div class="ts" aria-live="polite">
    <div v-for="t in list" :key="t.id" class="t" :class="t.kind">{{ t.text }}</div>
  </div>
</template>

<style scoped>
.ts { position: fixed; right: 18px; bottom: 18px; display: grid; gap: 8px; z-index: 200; max-width: 380px; }
.t { padding: 12px 16px; border-radius: 12px; color: #fff; font-weight: 500; box-shadow: 0 10px 30px rgba(0,0,0,.2); background: var(--green-dark); border-left: 6px solid var(--yellow); }
.t.bad { background: var(--red); border-left-color: #fff; }
</style>
