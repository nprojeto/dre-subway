# Fluxo de Caixa — Rede de lojas

Sistema de fluxo de caixa, DRE, previsto x realizado e conciliação bancária para rede de lojas,
com importação de extrato em PDF lida por IA.

- Frontend: Nuxt (esta pasta), publicado no GitHub Pages pelo arquivo `.github/workflows/deploy.yml`.
- Backend: Supabase Edge Function `api` (arquivo `api.index.ts`).
- Banco: Supabase Postgres (arquivo `schema.sql`).

Variáveis do repositório (Settings > Secrets and variables > Actions > Variables):
`SUPABASE_URL` e `SUPABASE_KEY` (chave pública/anon do projeto).
