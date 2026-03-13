-- ============================================
-- FinanceIA — Migration: WhatsApp Assistant
-- ============================================
-- Execute no SQL Editor do Supabase
-- ============================================
-- Requer: tabela receivables (supabase-migration-ux-gamification.sql)
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  reference_id uuid,
  channel text DEFAULT 'whatsapp',
  message_preview text,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_notifications" ON public.notification_log;
CREATE POLICY "users_own_notifications"
  ON public.notification_log
  FOR ALL USING (auth.uid() = user_id);

-- Índice para deduplicação (evitar enviar mesma notificação 2x no mesmo dia)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_dedup
  ON public.notification_log (user_id, type, COALESCE(reference_id::text, ''), date_trunc('day', sent_at));

-- Preferências WhatsApp no perfil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_preferences jsonb DEFAULT '{
    "whatsapp_7days": true,
    "whatsapp_3days": true,
    "whatsapp_due_day": true,
    "whatsapp_receivables": true,
    "whatsapp_weekly_summary": true,
    "whatsapp_daily_reminder": false,
    "whatsapp_weekly_tip": true
  }'::jsonb;

-- ============================================
-- pg_cron (opcional): configurar no Supabase Dashboard
-- Database → Extensions → pg_cron (habilitar)
-- SQL Editor: executar o job abaixo (ajuste a URL do projeto)
-- ============================================
-- SELECT cron.schedule(
--   'whatsapp-notifications-8h',
--   '0 8 * * *',
--   $$SELECT net.http_post(
--     url := 'https://SEU_PROJETO.supabase.co/functions/v1/whatsapp-cron',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{"mode":"8h"}'::jsonb
--   )$$
-- );
-- SELECT cron.schedule(
--   'whatsapp-notifications-21h',
--   '0 21 * * *',
--   $$SELECT net.http_post(
--     url := 'https://SEU_PROJETO.supabase.co/functions/v1/whatsapp-cron',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{"mode":"21h"}'::jsonb
--   )$$
-- );
