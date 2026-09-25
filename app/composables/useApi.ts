/** Chamadas para a Edge Function "api" do Supabase. */
export const useApi = () => {
  const cfg = useRuntimeConfig().public

  async function call<T = any>(path: string, method = 'GET', body?: unknown, auth = true): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: String(cfg.supabaseKey) }
    if (auth) {
      const sb = useSupabase()
      const { data } = await sb!.auth.getSession()
      if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`
    }
    let res: Response
    try {
      res = await fetch(`${cfg.supabaseUrl}/functions/v1/api${path}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new Error('Sem conexão com o servidor. Verifique sua internet.')
    }
    const out = await res.json().catch(() => ({}))
    if (res.status === 401 && auth) {
      await useSupabase()?.auth.signOut()
      navigateTo('/login')
    }
    if (!res.ok) throw new Error(out?.error || `Erro ${res.status}`)
    return out as T
  }

  const qs = (o: Record<string, any>) =>
    '?' + Object.entries(o)
      .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length))
      .map(([k, v]) => `${k}=${encodeURIComponent(Array.isArray(v) ? v.join(',') : v)}`).join('&')

  return {
    get: <T = any>(p: string, params?: Record<string, any>) => call<T>(p + (params ? qs(params) : '')),
    post: <T = any>(p: string, b?: unknown) => call<T>(p, 'POST', b ?? {}),
    patch: <T = any>(p: string, b?: unknown) => call<T>(p, 'PATCH', b ?? {}),
    del: <T = any>(p: string) => call<T>(p, 'DELETE'),
    pub: <T = any>(p: string) => call<T>(p, 'GET', undefined, false),
  }
}
