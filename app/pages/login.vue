<script setup lang="ts">
definePageMeta({ layout: false })
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const brand = ref<any>({})
const defLogo = useRuntimeConfig().app.baseURL + 'logo.png'

onMounted(async () => {
  try {
    const s = await useApi().pub('/public')
    brand.value = s.app ?? {}
    applyTheme(s)
  } catch {}
})

async function enter() {
  error.value = ''
  loading.value = true
  const { error: e } = await useSupabase()!.auth.signInWithPassword({ email: email.value.trim(), password: password.value })
  loading.value = false
  if (e) { error.value = 'E-mail ou senha incorretos.'; return }
  navigateTo('/')
}
</script>

<template>
  <div class="lg">
    <div class="lg-art" aria-hidden="true">
      <div class="stripe s1" /><div class="stripe s2" /><div class="stripe s3" />
      <div class="lg-quote">
        <span>O controle da sua loja</span>
        <strong>na palma da sua mão.</strong>
      </div>
    </div>
    <form class="lg-box" @submit.prevent="enter">
      <img :src="brand.logo || defLogo" alt="Logo" class="lg-logo">
      <h1>{{ brand.name || 'DRE SUBWAY' }}</h1>
      <p class="muted">{{ brand.subtitle || 'O controle da sua loja na palma da mão' }}</p>
      <label class="f">E-mail <input v-model="email" type="email" autocomplete="username" required></label>
      <label class="f">Senha <input v-model="password" type="password" autocomplete="current-password" required></label>
      <p v-if="error" class="neg small">{{ error }}</p>
      <button class="btn" :disabled="loading" style="width: 100%; padding: 13px">{{ loading ? 'Entrando...' : 'Entrar' }}</button>
      <p class="muted small">Esqueceu a senha? Peça ao administrador para redefinir.</p>
    </form>
  </div>
</template>

<style scoped>
.lg { min-height: 100vh; display: grid; grid-template-columns: 1.1fr 1fr; background: #fff; }
.lg-art { background: var(--green-dark); position: relative; overflow: hidden; display: flex; align-items: flex-end; padding: 56px; }
.stripe { position: absolute; left: -10%; width: 130%; height: 70px; border-radius: 40px; transform: rotate(-14deg); }
.s1 { top: 16%; background: var(--green); }
.s2 { top: 30%; background: var(--yellow); width: 90%; }
.s3 { top: 44%; background: #fff; opacity: .9; width: 70%; }
.lg-quote { position: relative; color: #fff; font-family: var(--display); line-height: 1.02; }
.lg-quote span { display: block; font-size: 38px; font-weight: 600; }
.lg-quote strong { display: block; font-size: 54px; font-weight: 700; color: var(--yellow); }
.lg-box { align-self: center; justify-self: center; width: 100%; max-width: 400px; padding: 32px; display: grid; gap: 14px; }
.lg-logo { width: 100%; max-width: 280px; height: auto; margin-bottom: 6px; }
.lg-box h1 { font-size: 40px; color: var(--green-dark); }
.lg-box p { margin: -8px 0 6px; }
@media (max-width: 860px) { .lg { grid-template-columns: 1fr; } .lg-art { display: none; } }
</style>
