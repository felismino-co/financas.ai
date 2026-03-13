-- ============================================
-- FinanceAI — Migration: Quiz Improvements
-- ============================================
-- Execute no SQL Editor do Supabase
-- Ref: Tarefas 5, 8, 9
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS income_sources jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS client_info jsonb DEFAULT '{}';

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- transactions.frequency já existe em alguns setups; adicionar se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'frequency'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN frequency text;
  END IF;
END $$;
