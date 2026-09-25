<script setup lang="ts">
/** Select de categoria agrupado por grupo. */
const props = defineProps<{ modelValue: string | null; direction?: string; noEmpty?: boolean; emptyLabel?: string }>()
const emit = defineEmits(['update:modelValue'])
const app = useApp()
const groups = computed(() => app.catOptions(props.direction))
const val = computed({
  get: () => props.modelValue ?? '',
  set: (v: string) => emit('update:modelValue', v || null),
})
</script>

<template>
  <select v-model="val">
    <option v-if="!noEmpty" value="">{{ emptyLabel ?? 'Sem categoria' }}</option>
    <optgroup v-for="g in groups" :key="g.group" :label="g.group">
      <option v-for="c in g.items" :key="c.id" :value="c.id">{{ c.name }}</option>
    </optgroup>
  </select>
</template>
