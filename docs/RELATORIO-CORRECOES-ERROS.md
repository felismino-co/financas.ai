# Relatório de Correções — Erros do App

## 1. O que foi corrigido

### ERRO 1 — Ícones PWA 404
- **Criados:** `public/icons/icon-192x192.svg` e `public/icons/icon-512x512.svg` com emoji 💰 e fundo escuro
- **Atualizado:** `vite.config.ts` e `public/manifest.json` para usar SVG em vez de PNG
- **Motivo:** PNG não existiam; SVG é suportado pelo manifest e evita dependência de geração de imagens

### ERRO 2 — Supabase 500 em várias tabelas
- **Criado:** `src/lib/supabase-error.ts` com helpers `getErrorMessage` e `getFriendlyError`
- **Atualizado:** `useBills.ts`, `useFamily.ts`, `useGoals.ts`, `useTransactions.ts`
- **Tratamento:** Erros 500/JWT/PGRST/permission retornam mensagem amigável
- **Mensagem:** "Erro ao conectar. Verifique as tabelas no banco." em vez de travar o app

### ERRO 3 — Perfil 400 (coluna email)
- **Causa:** `checkAndSendAlerts` em `useAlerts.ts` fazia `select('email, ...')` em profiles — email não existe em profiles (está em auth.users)
- **Correção:** `checkAndSendAlerts` agora recebe `userEmail` como parâmetro
- **Atualizado:** `AppLayout.tsx` chama `checkAndSendAlerts(user.id, user.email)`
- **Query:** Removida coluna `email` do select em profiles; `userEmail` vem do useAuth

### ERRO 4 — Bills travando ao editar (removeChild)
- **Causa:** `Select` do Radix (portal) dentro do `Dialog` causava conflito ao fechar
- **Correção:** Substituídos `Select` de "Dia do vencimento" e "Categoria" por `<select>` nativo
- **Removido:** Import de Select, SelectContent, SelectItem, SelectTrigger, SelectValue

### ERRO 5 — Rota /bills retornando 404
- **Criado:** `vercel.json` na raiz com rewrites para SPA
- **Configuração:** `{ "source": "/(.*)", "destination": "/index.html" }`
- **Efeito:** Todas as rotas do React Router passam a funcionar na Vercel

### ERRO 6 — CSS 404
- **Adicionado:** `base: "/"` em `vite.config.ts`
- **Garante:** Assets e CSS gerados com caminhos absolutos corretos para deploy

---

## 2. SQL adicional necessário

Se ainda houver erros 500 após as correções, verifique se as migrations foram executadas:

```sql
-- 1. bills (se não existir)
-- Execute: docs/supabase-setup.sql (já inclui bills) ou docs/supabase-migration-v2.sql

-- 2. Colunas em transactions (Pluggy)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'pluggy')),
  ADD COLUMN IF NOT EXISTS pluggy_transaction_id TEXT UNIQUE;

-- 3. RLS policies para bills (modo família)
-- Já incluído em setup.sql e migration-v2.sql
```

---

## 3. Arquivos criados/modificados

| Arquivo | Ação |
|---------|------|
| `public/icons/icon-192x192.svg` | Criado |
| `public/icons/icon-512x512.svg` | Criado |
| `public/manifest.json` | Modificado (PNG → SVG) |
| `vite.config.ts` | Modificado (ícones SVG, base: "/") |
| `vercel.json` | Criado |
| `src/lib/supabase-error.ts` | Criado |
| `src/hooks/useBills.ts` | Modificado (tratamento erro) |
| `src/hooks/useFamily.ts` | Modificado (tratamento erro) |
| `src/hooks/useGoals.ts` | Modificado (tratamento erro) |
| `src/hooks/useTransactions.ts` | Modificado (tratamento erro) |
| `src/hooks/useAlerts.ts` | Modificado (email via parâmetro) |
| `src/components/AppLayout.tsx` | Modificado (passa user.email) |
| `src/pages/BillsPage.tsx` | Modificado (Select → select nativo) |
