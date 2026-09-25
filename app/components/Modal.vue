<script setup lang="ts">
defineProps<{ title: string; wide?: boolean }>()
const emit = defineEmits(['close'])
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="ov" @mousedown.self="emit('close')">
      <div class="md" :class="{ wide }" role="dialog" :aria-label="title">
        <div class="md-head">
          <h2>{{ title }}</h2>
          <button class="btn ghost icon" aria-label="Fechar" @click="emit('close')">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" /></svg>
          </button>
        </div>
        <div class="md-body"><slot /></div>
        <div v-if="$slots.footer" class="md-foot"><slot name="footer" /></div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ov { position: fixed; inset: 0; background: rgba(0, 30, 12, .45); display: flex; align-items: flex-start; justify-content: center; padding: 6vh 16px; z-index: 100; overflow-y: auto; }
.md { background: #fff; border-radius: 18px; width: 100%; max-width: 560px; box-shadow: 0 30px 80px rgba(0,0,0,.3); }
.md.wide { max-width: 900px; }
.md-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px 8px; }
.md-body { padding: 10px 22px 18px; display: grid; gap: 14px; }
.md-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--line); }
</style>
