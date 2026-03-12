-- ============================================
-- FinanceAI — Setup completo Supabase
-- ============================================
-- Execute este SQL no SQL Editor do seu projeto Supabase
-- (Dashboard > SQL Editor > New query > Colar e Run)
--
-- Ordem: 1) DROP em ordem inversa  2) Tabelas sem forward refs
--        3) RLS e policies (após todas as tabelas existirem)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PARTE 1: DROP (ordem inversa das dependências)
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.insights CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.family_members CASCADE;
DROP TABLE IF EXISTS public.families CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================
-- PARTE 2: Criação das tabelas (ordem correta)
-- 1. profiles (só auth.users)
-- 2. families (auth.users)
-- 3. family_members (families + auth.users)
-- 4. transactions (auth.users + families)
-- 5. goals (auth.users + families)
-- 6. budgets (auth.users + families)
-- 7. insights (auth.users)
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  monthly_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  financial_goal TEXT NOT NULL DEFAULT '',
  financial_profile TEXT NOT NULL DEFAULT '',
  financial_score INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, user_id)
);

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  date DATE NOT NULL,
  recurring BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT CHECK (frequency IN ('weekly', 'monthly')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  deadline DATE NOT NULL,
  color TEXT NOT NULL DEFAULT '#00D4AA',
  emoji TEXT NOT NULL DEFAULT '🎯',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  limit_amount NUMERIC(12,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, family_id, category, month, year)
);

CREATE TABLE public.insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- ============================================
-- PARTE 3: RLS e policies (todas as tabelas já existem)
-- Todas usam auth.uid() corretamente; sem referência circular
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE USING (auth.uid() = id);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "families_select_owner_or_member"
  ON public.families FOR SELECT
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = families.id AND fm.user_id = auth.uid()
    )
  );
CREATE POLICY "families_insert_owner"
  ON public.families FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "families_update_owner"
  ON public.families FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "families_delete_owner"
  ON public.families FOR DELETE USING (auth.uid() = owner_id);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_members_select_own_or_owner"
  ON public.family_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_members.family_id AND f.owner_id = auth.uid()
    )
  );
CREATE POLICY "family_members_insert_own"
  ON public.family_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "family_members_update_own"
  ON public.family_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "family_members_delete_own_or_owner"
  ON public.family_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_members.family_id AND f.owner_id = auth.uid()
    )
  );

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_own_or_family"
  ON public.transactions FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = transactions.family_id AND fm.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "transactions_insert_own"
  ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own"
  ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own"
  ON public.transactions FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_select_own_or_family"
  ON public.goals FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = goals.family_id AND fm.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "goals_insert_own"
  ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update_own"
  ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goals_delete_own"
  ON public.goals FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_select_own_or_family"
  ON public.budgets FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = budgets.family_id AND fm.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "budgets_insert_own"
  ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update_own"
  ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets_delete_own"
  ON public.budgets FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insights_select_own"
  ON public.insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insights_insert_own"
  ON public.insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "insights_update_own"
  ON public.insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "insights_delete_own"
  ON public.insights FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PARTE 4: Trigger em auth.users → cria profile
-- Referencia auth.users (NEW) e insere em public.profiles
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, monthly_income, financial_goal, financial_profile, financial_score, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    0,
    '',
    'A definir',
    0,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PARTE 5: Índices
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_family_date ON public.transactions(family_id, date DESC) WHERE family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month_year ON public.budgets(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_user_read ON public.insights(user_id, read);

-- Fim do setup
