import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';
import { sendEmail } from '@/lib/email';

export interface AlertPreferences {
  email_alerts_enabled: boolean;
  email_weekly_digest: boolean;
  email_bills_reminder: boolean;
}

export function useAlerts() {
  const { user } = useAuth();
  const { profile, refetchProfile } = useAuthState();

  const preferences: AlertPreferences = {
    email_alerts_enabled: profile?.email_alerts_enabled ?? true,
    email_weekly_digest: profile?.email_weekly_digest ?? true,
    email_bills_reminder: profile?.email_bills_reminder ?? true,
  };

  const updatePreferences = useCallback(
    async (updates: Partial<AlertPreferences>) => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (!error) await refetchProfile();
    },
    [user?.id, refetchProfile]
  );

  const sendWeeklyDigest = useCallback(async () => {
    if (!user?.email || !preferences.email_alerts_enabled || !preferences.email_weekly_digest) return;
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>FinanceIA</h2>
        <p>Olá! Aqui está seu resumo semanal.</p>
        <p>Acesse o app para ver seus insights e metas.</p>
        <p style="color:#888;font-size:12px;">FinanceIA - Seu coach financeiro com IA</p>
      </div>
    `;
    await sendEmail({
      to: user.email,
      type: 'weekly_digest',
      subject: 'Resumo semanal - FinanceIA',
      html,
    });
  }, [user?.email, preferences.email_alerts_enabled, preferences.email_weekly_digest]);

  const sendBillsReminder = useCallback(
    async (bills: { description: string; amount: number; due_day: number }[]) => {
      if (!user?.email || !preferences.email_alerts_enabled || !preferences.email_bills_reminder) return;
      const list = bills.map(b => `<li>${b.description} - R$ ${b.amount.toLocaleString('pt-BR')} (dia ${b.due_day})</li>`).join('');
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2>FinanceIA - Contas a pagar</h2>
          <p>Contas a vencer em breve:</p>
          <ul>${list}</ul>
          <p><a href="${window.location.origin}/bills">Ver todas</a></p>
        </div>
      `;
      await sendEmail({
        to: user.email,
        type: 'bills_reminder',
        subject: 'Contas a pagar - FinanceIA',
        html,
        meta: { bills },
      });
    },
    [user?.email, preferences.email_alerts_enabled, preferences.email_bills_reminder]
  );

  return {
    preferences,
    updatePreferences,
    sendWeeklyDigest,
    sendBillsReminder,
  };
}
