import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/** Cliente do Supabase (só autenticação). Retorna null se não configurado. */
export const useSupabase = (): SupabaseClient | null => {
  if (client) return client
  const c = useRuntimeConfig().public
  if (!c.supabaseUrl || !c.supabaseKey) return null
  client = createClient(String(c.supabaseUrl), String(c.supabaseKey), {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'fluxo-auth' },
  })
  return client
}
