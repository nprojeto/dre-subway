<script setup lang="ts">
const app = useApp()
const api = useApi()
const toast = useToast()
const users = ref<any[]>([])
const loading = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const term = ref('')

const isAdmin = computed(() => app.data.value.isAdmin)
const allRoles = [
  { value: 'admin', label: 'Administrador geral', hint: 'Vê todas as empresas e lojas e altera tudo.' },
  { value: 'empresario', label: 'Empresário', hint: 'Vê e administra todas as lojas da sua empresa.' },
  { value: 'gestor', label: 'Gestor', hint: 'Lança, importa e edita só nas lojas liberadas.' },
  { value: 'visualizador', label: 'Visualizador', hint: 'Só consulta as lojas liberadas.' },
]
const roles = computed(() => allRoles.filter((r) => isAdmin.value || r.value !== 'admin'))
const roleLabel = Object.fromEntries(allRoles.map((r) => [r.value, r.label]))
const storeOpts = computed(() => app.data.value.stores
  .filter((s) => !editing.value?.company_id || s.company_id === editing.value.company_id)
  .map((s) => ({ value: s.id, label: s.name, sub: s.code ?? '' })))

async function load() {
  loading.value = true
  try { users.value = await api.get('/users') } catch (e: any) { toast.bad(e) } finally { loading.value = false }
}
onMounted(() => { if (app.data.value.isManager) load() })

const shown = computed(() => {
  const t = term.value.toLowerCase()
  return users.value.filter((u) => !t || `${u.name} ${u.email}`.toLowerCase().includes(t))
})
const storesText = (u: any) => {
  if (u.role === 'admin') return 'Todas'
  if (u.role === 'empresario') return 'Todas da empresa'
  return u.store_ids.length === 1 ? app.storeMap.value[u.store_ids[0]]?.name ?? '1 loja' : `${u.store_ids.length} lojas`
}

const openNew = () => (editing.value = {
  name: '', email: '', password: '', role: isAdmin.value ? 'empresario' : 'gestor', store_ids: [], active: true,
  company_id: isAdmin.value ? null : app.data.value.profile?.company_id,
})
const openEdit = (u: any) => (editing.value = { ...u, password: '', store_ids: [...u.store_ids] })

async function save() {
  const e = editing.value
  if (e.role === 'empresario' && !e.company_id) return toast.bad('Escolha a empresa do empresário.')
  saving.value = true
  try {
    const body = { name: e.name, role: e.role, active: e.active, store_ids: e.store_ids, company_id: e.company_id, password: e.password || undefined }
    if (e.id) await api.patch(`/users/${e.id}`, body)
    else await api.post('/users', { ...body, email: e.email, password: e.password })
    toast.ok(e.id ? 'Usuário atualizado' : 'Usuário criado')
    editing.value = null
    load()
  } catch (err: any) { toast.bad(err) } finally { saving.value = false }
}
async function remove(u: any) {
  if (!confirm(`Excluir o usuário ${u.email}?`)) return
  try { await api.del(`/users/${u.id}`); toast.ok('Usuário excluído'); load() } catch (e: any) { toast.bad(e) }
}
</script>

<template>
  <div>
    <div class="page-head">
      <div><h1>Usuários</h1><p>Quem acessa o sistema e quais lojas cada um enxerga.</p></div>
    </div>
    <div v-if="!app.data.value.isManager" class="card empty"><h3>Acesso restrito</h3><p>Somente administradores e empresários.</p></div>
    <div v-else class="card">
      <div class="row" style="margin-bottom: 14px">
        <input v-model="term" placeholder="Buscar por nome ou e-mail" style="max-width: 300px">
        <div class="spacer" />
        <button class="btn" @click="openNew">+ Novo usuário</button>
      </div>
      <div v-if="loading" class="loading-box"><span class="spinner" /></div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th v-if="isAdmin">Empresa</th><th>Lojas</th><th>Situação</th><th /></tr></thead>
          <tbody>
            <tr v-for="u in shown" :key="u.id">
              <td>{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>{{ roleLabel[u.role] }}</td>
              <td v-if="isAdmin" class="small">{{ app.companyMap.value[u.company_id]?.name ?? '—' }}</td>
              <td class="small">{{ storesText(u) }}</td>
              <td><span class="badge" :class="u.active ? 'ok' : 'bad'">{{ u.active ? 'Ativo' : 'Bloqueado' }}</span></td>
              <td class="num">
                <button class="link" @click="openEdit(u)">Editar</button>
                <button v-if="u.id !== app.data.value.profile?.id" class="link danger" @click="remove(u)">Excluir</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="editing" :title="editing.id ? 'Editar usuário' : 'Novo usuário'" @close="editing = null">
      <label class="f">Nome<input v-model="editing.name"></label>
      <label class="f">E-mail<input v-model="editing.email" type="email" :disabled="!!editing.id"></label>
      <label class="f">{{ editing.id ? 'Nova senha (deixe vazio para manter)' : 'Senha (mínimo 6 caracteres)' }}<input v-model="editing.password" type="text" autocomplete="new-password"></label>
      <label class="f">Perfil
        <select v-model="editing.role"><option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option></select>
        <small class="muted" style="font-weight: 400">{{ allRoles.find((r) => r.value === editing.role)?.hint }}</small>
      </label>
      <label v-if="isAdmin && editing.role !== 'admin'" class="f">Empresa
        <select v-model="editing.company_id" @change="editing.store_ids = []">
          <option :value="null">Sem empresa</option>
          <option v-for="c in app.data.value.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <small v-if="!app.data.value.companies.length" class="muted" style="font-weight: 400">Cadastre a empresa antes em Cadastros > Empresas.</small>
      </label>
      <div v-if="editing.role === 'gestor' || editing.role === 'visualizador'" class="f">Lojas liberadas
        <MultiSelect v-model="editing.store_ids" :options="storeOpts" all-label="Nenhuma loja" placeholder="Buscar loja" />
      </div>
      <label v-if="editing.id" class="row" style="gap: 8px"><input v-model="editing.active" type="checkbox"> Acesso liberado</label>
      <template #footer>
        <button class="btn ghost" @click="editing = null">Cancelar</button>
        <button class="btn" :disabled="saving" @click="save">{{ saving ? 'Salvando...' : 'Salvar' }}</button>
      </template>
    </Modal>
  </div>
</template>
