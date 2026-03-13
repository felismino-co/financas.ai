-- ============================================
-- FinanceAI — Migration: UX, Gamificação, Receivables
-- ============================================
-- Execute no SQL Editor do Supabase após as migrations anteriores
-- Ref: docs/architecture/SPECIFICACAO-UX-GAMIFICACAO.md
-- ============================================

-- ----- RECEIVABLES (A Receber) -----
CREATE TABLE IF NOT EXISTS public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  frequency TEXT DEFAULT 'once' CHECK (frequency IN ('once', 'monthly', 'recurring')),
  installments INTEGER DEFAULT 1,
  installment_value NUMERIC(12,2),
  category TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'overdue')),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receivables_user_id ON public.receivables(user_id);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON public.receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON public.receivables(status);

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receivables_select_own"
  ON public.receivables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "receivables_insert_own"
  ON public.receivables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "receivables_update_own"
  ON public.receivables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "receivables_delete_own"
  ON public.receivables FOR DELETE USING (auth.uid() = user_id);

-- ----- ACHIEVEMENTS (Insígnias) -----
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_select_own"
  ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "achievements_insert_own"
  ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----- SCORE_LOG (Histórico de pontos - opcional) -----
CREATE TABLE IF NOT EXISTS public.score_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_score_log_user_id ON public.score_log(user_id);

ALTER TABLE public.score_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_log_select_own"
  ON public.score_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "score_log_insert_own"
  ON public.score_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----- PROFILES: Score e Streak -----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_level TEXT DEFAULT 'iniciante',
  ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- ----- BILLS: Variável, Pago, Parcelas -----
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS is_variable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS paid_installments INTEGER DEFAULT 0;
