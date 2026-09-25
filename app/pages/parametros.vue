<script setup lang="ts">
const app = useApp()
const api = useApi()
const toast = useToast()
const s = app.data.value.settings
const brand = ref({ name: '', subtitle: '', logo: null as string | null, ...(s.app ?? {}) })
const tema = ref({ primary: '#008C15', secondary: '#FFC20E', dark: '#00391A', ...(s.tema ?? {}) })
const ia = ref({ model: 'claude-sonnet-5', ...(s.ia ?? {}) })
const saving = ref(false)

watch(tema, (t) => applyTheme({ tema: t }), { deep: true })

function pickLogo(e: Event) {
  const fl = (e.target as HTMLInputElement).files?.[0]
  if (!fl) return
  const img = new Image()
  img.onload = () => {
    const max = 256
    const k = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    brand.value.logo = c.toDataURL('image/png')
    URL.revokeObjectURL(img.src)
  }
  img.src = URL.createObjectURL(fl)
}

async function save() {
  saving.value = true
  try {
    await api.post('/settings', { key: 'app', value: brand.value })
    await api.post('/settings', { key: 'tema', value: tema.value })
    await api.post('/settings', { key: 'ia', value: ia.value })
    await app.load()
    toast.ok('Parâmetros salvos')
  } catch (e: any) { toast.bad(e) } finally { saving.value = false }
}
function resetColors() { tema.value = { primary: '#008C15', secondary: '#FFC20E', dark: '#00391A' } }
</script>

<template>
  <div>
    <div class="page-head">
      <div><h1>Parâmetros</h1><p>Aparência do sistema e leitura de extratos.</p></div>
      <div class="spacer" />
      <button v-if="app.data.value.isAdmin" class="btn" :disabled="saving" @click="save">{{ saving ? 'Salvando...' : 'Salvar parâmetros' }}</button>
    </div>

    <div v-if="!app.data.value.isAdmin" class="card empty"><h3>Acesso restrito</h3><p>Somente administradores.</p></div>
    <div v-else class="grid g2">
      <div class="card grid">
        <h3>Marca</h3>
        <label class="f">Nome do sistema<input v-model="brand.name"></label>
        <label class="f">Subtítulo<input v-model="brand.subtitle"></label>
        <div class="f">
          <span>Logo</span>
          <div class="row">
            <img v-if="brand.logo" :src="brand.logo" alt="Logo atual" class="logo-prev">
            <label class="btn ghost sm">Enviar imagem<input type="file" accept="image/*" hidden @change="pickLogo"></label>
            <button v-if="brand.logo" class="link danger" @click="brand.logo = null">Remover</button>
          </div>
          <small class="muted" style="font-weight: 400">Use o arquivo oficial do logo (PNG com fundo transparente).</small>
        </div>
      </div>

      <div class="card grid">
        <h3>Cores</h3>
        <div class="grid g3">
          <label class="f">Principal<input v-model="tema.primary" type="color"></label>
          <label class="f">Destaque<input v-model="tema.secondary" type="color"></label>
          <label class="f">Menu lateral<input v-model="tema.dark" type="color"></label>
        </div>
        <div><button class="link" @click="resetColors">Voltar às cores padrão</button></div>
      </div>

      <div class="card grid">
        <h3>Leitura de extratos (IA)</h3>
        <label class="f">Modelo
          <select v-model="ia.model">
            <option value="claude-sonnet-5">Claude Sonnet 5 (mais preciso)</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (mais barato e rápido)</option>
            <option value="claude-opus-5-5">Claude Opus 5.5 (máxima precisão, mais caro)</option>
          </select>
        </label>
        <small class="muted">A chave da IA fica guardada no Supabase (segredo ANTHROPIC_API_KEY), nunca no navegador.</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logo-prev { width: 64px; height: 64px; object-fit: contain; background: var(--bg); border-radius: 10px; padding: 4px; }
</style>
