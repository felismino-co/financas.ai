-- ============================================
-- FinanceIA — Migration: Advanced Features
-- ============================================
-- Dívidas inteligentes, A Receber, Perfil, Tema, Retenção
-- Execute no SQL Editor do Supabase
-- ============================================

-- ----- BILLS MELHORADAS -----
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS bill_type text DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS installment_current integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_total integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes_history jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS card_limit decimal(12,2),
  ADD COLUMN IF NOT EXISTS card_closing_day integer,
  ADD COLUMN IF NOT EXISTS creditor_name text,
  ADD COLUMN IF NOT EXISTS total_amount decimal(12,2),
  ADD COLUMN IF NOT EXISTS paid_amount decimal(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- ----- RECEIVABLES MELHORADAS -----
ALTER TABLE public.receivables
  ADD COLUMN IF NOT EXISTS receivable_type text DEFAULT 'recurring',
  ADD COLUMN IF NOT EXISTS installment_current integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_total integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes_history jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS debtor_name text,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS service_description text,
  ADD COLUMN IF NOT EXISTS total_amount decimal(12,2),
  ADD COLUMN IF NOT EXISTS received_amount decimal(12,2) DEFAULT 0;

-- status já existe em receivables; garantir default
ALTER TABLE public.receivables
  ALTER COLUMN status SET DEFAULT 'pending';

-- ----- DESAFIOS SEMANAIS -----
CREATE TABLE IF NOT EXISTS public.weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_key text NOT NULL,
  challenge_data jsonb DEFAULT '{}',
  progress integer DEFAULT 0,
  target integer NOT NULL,
  points_reward integer NOT NULL,
  week_start date NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_challenges_user_week
  ON public.weekly_challenges(user_id, week_start);

ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_challenges" ON public.weekly_challenges;
CREATE POLICY "users_own_challenges"
  ON public.weekly_challenges
  FOR ALL USING (auth.uid() = user_id);

-- ----- PROFILES: TEMA E RETENÇÃO -----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_config jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS streak_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date date,
  ADD COLUMN IF NOT EXISTS birthday_celebrated_year integer;

-- ----- INSIGHTS: TIPO PARA RECOMENDAÇÕES DIÁRIAS -----
-- (tabela insights já existe; tipo 'daily_recommendation' pode ser usado)
