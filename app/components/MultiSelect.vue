<script setup lang="ts">
/** Seleção múltipla com busca (aguenta milhares de itens). */
const props = defineProps<{
  modelValue: string[]
  options: { value: string; label: string; sub?: string }[]
  allLabel?: string
  placeholder?: string
  single?: boolean
}>()
const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const term = ref('')
const root = ref<HTMLElement>()

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const filtered = computed(() => {
  const t = norm(term.value)
  const list = t ? props.options.filter((o) => norm(`${o.label} ${o.sub ?? ''}`).includes(t)) : props.options
  return list
})
const shown = computed(() => filtered.value.slice(0, 200))
const selected = computed(() => new Set(props.modelValue))
const summary = computed(() => {
  const n = props.modelValue.length
  if (!n) return props.allLabel ?? 'Todos'
  if (n === 1) return props.options.find((o) => o.value === props.modelValue[0])?.label ?? '1 selecionado'
  return `${n} selecionados`
})

function toggle(v: string) {
  if (props.single) { emit('update:modelValue', [v]); open.value = false; return }
  const s = new Set(props.modelValue)
  s.has(v) ? s.delete(v) : s.add(v)
  emit('update:modelValue', [...s])
}
const selectShown = () => emit('update:modelValue', [...new Set([...props.modelValue, ...filtered.value.map((o) => o.value)])])
const clear = () => { emit('update:modelValue', []); if (props.single) open.value = false }

const onDoc = (e: MouseEvent) => { if (root.value && !root.value.contains(e.target as Node)) open.value = false }
onMounted(() => document.addEventListener('mousedown', onDoc))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDoc))
</script>

<template>
  <div ref="root" class="ms">
    <button type="button" class="ms-btn" :class="{ on: modelValue.length }" @click="open = !open">
      <span class="ms-sum">{{ summary }}</span>
      <svg width="14" height="14" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" /></svg>
    </button>
    <div v-if="open" class="ms-pop">
      <input v-model="term" :placeholder="placeholder ?? 'Buscar...'" autofocus>
      <div class="ms-actions">
        <button v-if="!single && term" type="button" class="link" @click="selectShown">Marcar {{ filtered.length }}</button>
        <button type="button" class="link" @click="clear">{{ allLabel ?? 'Todos' }}</button>
      </div>
      <div class="ms-list">
        <label v-for="o in shown" :key="o.value" class="ms-item">
          <input :type="single ? 'radio' : 'checkbox'" :checked="selected.has(o.value)" @change="toggle(o.value)">
          <span>{{ o.label }}<small v-if="o.sub"> {{ o.sub }}</small></span>
        </label>
        <p v-if="filtered.length > shown.length" class="muted small ms-more">
          +{{ filtered.length - shown.length }} itens. Digite para refinar a busca.
        </p>
        <p v-if="!filtered.length" class="muted small ms-more">Nada encontrado.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ms { position: relative; min-width: 180px; }
.ms-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 40px; padding: 8px 12px; background: #fff; border: 1.5px solid var(--line); border-radius: var(--radius-sm); font: 500 14px var(--font); color: var(--ink); cursor: pointer; }
.ms-btn.on { border-color: var(--green); background: var(--green-soft); }
.ms-sum { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
.ms-pop { position: absolute; z-index: 40; top: calc(100% + 6px); left: 0; width: max(100%, 320px); background: #fff; border-radius: var(--radius); box-shadow: 0 12px 40px rgba(0,0,0,.18); padding: 10px; }
.ms-actions { display: flex; justify-content: space-between; margin: 6px 0; }
.ms-list { max-height: 300px; overflow-y: auto; }
.ms-item { display: flex; gap: 10px; align-items: center; padding: 7px 6px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.ms-item:hover { background: var(--green-soft); }
.ms-item small { color: var(--muted); }
.ms-more { padding: 6px; }
</style>
