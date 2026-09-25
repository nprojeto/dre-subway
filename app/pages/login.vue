<script setup lang="ts">
definePageMeta({ layout: false })
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const brand = ref<any>({})

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
      <p class="lg-quote">O caixa de cada loja,<br>no mesmo lugar.</p>
    </div>
    <form class="lg-box" @submit.prevent="enter">
      <img v-if="brand.logo" :src="brand.logo" alt="" class="lg-logo">
      <h1>{{ brand.name || 'Fluxo de Caixa' }}</h1>
      <p class="muted">{{ brand.subtitle || 'Rede de lojas' }}</p>
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
.s1 { top: 18%; background: var(--green); }
.s2 { top: 32%; background: var(--yellow); width: 90%; }
.s3 { top: 46%; background: var(--green); opacity: .5; width: 70%; }
.lg-quote { position: relative; color: #fff; font-family: var(--display); font-size: 44px; font-weight: 700; line-height: 1.05; margin: 0; }
.lg-box { align-self: center; justify-self: center; width: 100%; max-width: 380px; padding: 32px; display: grid; gap: 14px; }
.lg-box h1 { font-size: 36px; }
.lg-box p { margin: -8px 0 6px; }
.lg-logo { width: 72px; height: 72px; object-fit: contain; }
@media (max-width: 860px) { .lg { grid-template-columns: 1fr; } .lg-art { display: none; } }
</style>
