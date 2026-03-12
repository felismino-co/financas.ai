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
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Se a tabela já existir sem status:
ALTER TABLE public.bank_connections
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error'));

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
