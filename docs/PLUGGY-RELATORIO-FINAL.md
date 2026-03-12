# Relatório Final — Integração Pluggy (Open Finance) no FinanceIA

## 1. O que foi implementado

### Tarefa 1 — Instalação e configuração
- `pluggy-sdk` já estava instalado
- `react-pluggy-connect` instalado para o widget do frontend
- `docs/supabase-migration-pluggy.sql` criado
- `.env.example` atualizado com instruções para Pluggy

### Tarefa 2 — Edge Functions
- **pluggy-connect-token**: Recebe POST com `userId`, valida JWT, gera connect token via API Pluggy e retorna `{ accessToken }`
- **pluggy-sync**: Recebe POST com `{ itemId, userId }`, busca transações (últimos 3 meses) e contas do item, insere em `transactions` com `source: 'pluggy'` e `pluggy_transaction_id`, evita duplicatas, atualiza `last_synced_at` em `bank_connections`

### Tarefa 3 — Migration SQL
- Tabela `bank_connections` com RLS
- Colunas em `transactions`: `source`, `pluggy_transaction_id`
- Índices criados

### Tarefa 4 — Hooks e lib
- **useBankConnections**: `getConnections`, `canAddBank`, `addConnection`, `removeConnection`, `syncConnection`, `getBankLimit`, `getExtraBankPrice`
- **usePluggyCredits**: controle de créditos (1 por banco)
- **lib/pluggy.ts**: `getConnectToken`, `syncItem`, `mapPluggyTransaction` (DEBIT→expense, CREDIT→income)

### Tarefa 5 — BanksPage
- Header com título e subtítulo
- Card de plano (Free: upgrade Pro, Pro: 1 banco incluso + extras R$9,90)
- Lista de bancos conectados com status, última sync, botões Sincronizar e Desconectar
- Botão "Conectar novo banco" (widget Pluggy)
- Modal de upgrade quando limite Free
- Modal de banco extra (R$9,90) com placeholder #kiwify-banco-extra

### Tarefa 6 — Transações importadas
- Badge "Importado" com tooltip
- Filtro Todas / Manuais / Importadas
- Transações importadas não editáveis (apenas excluíveis)

### Tarefa 7 — Dashboard e Perfil
- Dashboard: card "Último sync: há X" com botão Sincronizar quando tem banco; card "Conecte seu banco" quando não tem
- Perfil: card "Contas bancárias conectadas" com X/Y e botão Gerenciar

### Tarefa 8 — Menu e navegação
- Rota `/banks` em App.tsx
- Item "Bancos" no BottomNav e DesktopSidebar

---

## 2. O que ficou pendente

- **Link Kiwify**: substituir `#kiwify-banco-extra` pelo link real de checkout para banco extra
- **Credenciais Pluggy**: configurar `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` nos secrets do Supabase
- **Testes**: validar fluxo completo com conta Pluggy sandbox

---

## 3. SQL completo — docs/supabase-migration-pluggy.sql

```sql
-- ============================================
-- FinanceAI — Migration Pluggy: bank_connections, transactions
-- ============================================
-- Execute após supabase-migration-v2.sql
-- ============================================

-- ----- BANK_CONNECTIONS -----
CREATE TABLE IF NOT EXISTS public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pluggy_item_id TEXT NOT NULL UNIQUE,
  institution_name TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_user_id ON public.bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_pluggy_item_id ON public.bank_connections(pluggy_item_id);

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bank_connections"
  ON public.bank_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----- TRANSACTIONS: source e pluggy_transaction_id -----
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'pluggy')),
  ADD COLUMN IF NOT EXISTS pluggy_transaction_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_transactions_pluggy_transaction_id ON public.transactions(pluggy_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source);
```

---

## 4. Checklist manual

- [ ] Executar `docs/supabase-migration-pluggy.sql` no SQL Editor do Supabase
- [ ] `npx supabase functions deploy pluggy-connect-token`
- [ ] `npx supabase functions deploy pluggy-sync`
- [ ] `npx supabase secrets set PLUGGY_CLIENT_ID=seu_client_id`
- [ ] `npx supabase secrets set PLUGGY_CLIENT_SECRET=seu_client_secret`
- [ ] Substituir `#kiwify-banco-extra` pelo link real de checkout para banco extra

---

## 5. Comandos prontos para rodar no terminal

```powershell
# 1. Ir para o projeto
cd "c:\Users\adria\Downloads\Saúde Financeira .ia\financeai-your-smart-money-companion-main"

# 2. Deploy das Edge Functions
npx supabase functions deploy pluggy-connect-token
npx supabase functions deploy pluggy-sync

# 3. Configurar secrets (substitua pelos valores reais)
npx supabase secrets set PLUGGY_CLIENT_ID=seu_client_id
npx supabase secrets set PLUGGY_CLIENT_SECRET=seu_client_secret
```

---

## 6. Limites de plano

- **Free**: 0 bancos (não tem acesso)
- **Pro**: 3 bancos (1 incluso + 2 extras pagos)
- **Banco extra**: R$ 9,90 (pagamento único, placeholder)
