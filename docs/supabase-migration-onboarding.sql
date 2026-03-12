-- ============================================
-- FinanceAI — Migration: Onboarding, Créditos IA, Planos e Tour
-- ============================================
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor > New query)
-- Aplica em projetos que já têm as tabelas base (profiles, transactions, goals)
-- ============================================

-- ----- PROFILES: Novas colunas onboarding -----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS has_children TEXT,
  ADD COLUMN IF NOT EXISTS income_type TEXT,
  ADD COLUMN IF NOT EXISTS income_variability TEXT,
  ADD COLUMN IF NOT EXISTS financial_behavior TEXT,
  ADD COLUMN IF NOT EXISTS debts JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fixed_expenses JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS goals_selected TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS main_goal TEXT,
  ADD COLUMN IF NOT EXISTS goal_timeframe TEXT,
  ADD COLUMN IF NOT EXISTS plans_ahead TEXT,
  ADD COLUMN IF NOT EXISTS extra_money_behavior TEXT;

-- ----- PROFILES: Créditos IA -----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_credits_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_credits_limit INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS ai_credits_reset_at TIMESTAMPTZ;

-- ----- PROFILES: Planos e Tour -----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN NOT NULL DEFAULT false;

-- Comentários (opcional)
COMMENT ON COLUMN public.profiles.ai_credits_used IS 'Créditos de IA usados no mês atual';
COMMENT ON COLUMN public.profiles.ai_credits_limit IS 'Limite mensal (30 free, 999999 pro)';
COMMENT ON COLUMN public.profiles.ai_credits_reset_at IS 'Data/hora do próximo reset (início do mês)';
COMMENT ON COLUMN public.profiles.plan_type IS 'free | pro';
COMMENT ON COLUMN public.profiles.tour_completed IS 'Se o usuário já concluiu o tour guiado';
