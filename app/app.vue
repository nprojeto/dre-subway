<script setup lang="ts">
const configured = !!useSupabase()
</script>

<template>
  <div v-if="!configured" class="empty" style="padding: 80px 20px">
    <h3>Sistema ainda não configurado</h3>
    <p>Cadastre as variáveis SUPABASE_URL e SUPABASE_KEY no GitHub e publique de novo.</p>
  </div>
  <NuxtLayout v-else>
    <NuxtPage />
  </NuxtLayout>
  <Toasts />
</template>
