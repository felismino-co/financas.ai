-- ============================================
-- FinanceAI — Migration v2: Email, WhatsApp, Bills
-- ============================================
-- Execute no SQL Editor do Supabase após supabase-migration-onboarding.sql
-- ============================================

-- ----- PROFILES: Preferências de email e WhatsApp -----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_weekly_digest BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_bills_reminder BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"budget_alert":true,"weekly_report":true,"goal_achieved":true,"monthly_plan":true}'::jsonb;

-- ----- EMAIL_LOGS -----
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email_logs"
  ON public.email_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert email_logs"
  ON public.email_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ----- BILLS -----
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income','expense')),
  category TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_family_id ON public.bills(family_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_day ON public.bills(due_day);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own bills" ON public.bills;

CREATE POLICY "bills_select_own_or_family"
  ON public.bills FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = bills.family_id AND fm.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "bills_insert_own"
  ON public.bills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bills_update_own"
  ON public.bills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bills_delete_own"
  ON public.bills FOR DELETE USING (auth.uid() = user_id);
