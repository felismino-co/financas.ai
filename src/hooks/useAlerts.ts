import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';
import { sendBudgetAlert, sendWeeklyReport, sendGoalAchieved, sendMonthlyPlan } from '@/lib/email';

export interface AlertPreferences {
  email_alerts_enabled: boolean;
  email_weekly_digest: boolean;
  email_bills_reminder: boolean;
  budget_alert: boolean;
  weekly_report: boolean;
  goal_achieved: boolean;
  monthly_plan: boolean;
}

const DEFAULT_PREFS: AlertPreferences = {
  email_alerts_enabled: true,
  email_weekly_digest: true,
  email_bills_reminder: true,
  budget_alert: true,
  weekly_report: true,
  goal_achieved: true,
  monthly_plan: true,
};

export function useAlerts() {
  const { user } = useAuth();
  const { profile, refetchProfile } = useAuthState();

  const prefs = profile?.preferences as AlertPreferences['budget_alert'] extends boolean ? Partial<AlertPreferences> : never;
  const preferences: AlertPreferences = {
    ...DEFAULT_PREFS,
    email_alerts_enabled: profile?.email_alerts_enabled ?? true,
    email_weekly_digest: profile?.email_weekly_digest ?? true,
    email_bills_reminder: profile?.email_bills_reminder ?? true,
    budget_alert: prefs?.budget_alert ?? true,
    weekly_report: prefs?.weekly_report ?? true,
    goal_achieved: prefs?.goal_achieved ?? true,
    monthly_plan: prefs?.monthly_plan ?? true,
  };

  const updatePreferences = useCallback(
    async (updates: Partial<AlertPreferences>) => {
      if (!user?.id) return;
      const payload: Record<string, unknown> = {};
      if ('email_alerts_enabled' in updates) payload.email_alerts_enabled = updates.email_alerts_enabled;
      if ('email_weekly_digest' in updates) payload.email_weekly_digest = updates.email_weekly_digest;
      if ('email_bills_reminder' in updates) payload.email_bills_reminder = updates.email_bills_reminder;
      if ('budget_alert' in updates || 'weekly_report' in updates || 'goal_achieved' in updates || 'monthly_plan' in updates) {
        payload.preferences = {
          ...(profile?.preferences as object || {}),
          ...(updates.budget_alert !== undefined && { budget_alert: updates.budget_alert }),
          ...(updates.weekly_report !== undefined && { weekly_report: updates.weekly_report }),
          ...(updates.goal_achieved !== undefined && { goal_achieved: updates.goal_achieved }),
          ...(updates.monthly_plan !== undefined && { monthly_plan: updates.monthly_plan }),
        };
      }
      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (!error) await refetchProfile();
    },
    [user?.id, profile?.preferences, refetchProfile]
  );

  const sendBillsReminder = useCallback(
    async (bills: { description: string; amount: number; due_day: number }[]) => {
      if (!user?.email || !preferences.email_alerts_enabled || !preferences.email_bills_reminder) return;
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'bills_reminder',
          to: user.email,
          data: { bills },
        },
      });
      if (error || data?.error) return;
    },
    [user?.email, preferences.email_alerts_enabled, preferences.email_bills_reminder]
  );

  return {
    preferences,
    updatePreferences,
    sendBillsReminder,
  };
}

/** Verifica e envia alertas. Chamar no login. Email vem de auth.users via parâmetro. */
export async function checkAndSendAlerts(userId: string, userEmail: string): Promise<void> {
  const { data: profile } = await supabase.from('profiles').select('preferences, email_alerts_enabled').eq('id', userId).single();
  if (!userEmail || !profile || profile.email_alerts_enabled === false) return;

  const prefs = (profile.preferences as Record<string, boolean>) || {};
  const budgetAlert = prefs.budget_alert !== false;
  const weeklyReport = prefs.weekly_report !== false;
  const goalAchieved = prefs.goal_achieved !== false;
  const monthlyPlan = prefs.monthly_plan !== false;

  const today = new Date().toISOString().split('T')[0];
  const { data: sentToday } = await supabase
    .from('email_logs')
    .select('id')
    .eq('user_id', userId)
    .gte('sent_at', `${today}T00:00:00Z`)
    .limit(1);

  if (sentToday?.length) return;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount, category')
    .eq('user_id', userId)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth);

  const { data: budgets } = await supabase
    .from('budgets')
    .select('category, limit_amount')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year);

  const spentByCat: Record<string, number> = {};
  (transactions || []).filter((t) => t.type === 'expense').forEach((t) => {
    spentByCat[t.category] = (spentByCat[t.category] || 0) + Number(t.amount);
  });

  if (budgetAlert && budgets?.length) {
    for (const b of budgets) {
      const spent = spentByCat[b.category] || 0;
      const limit = Number(b.limit_amount);
      if (limit <= 0) continue;
      const pct = Math.round((spent / limit) * 100);
      if (pct >= 80) {
        await sendBudgetAlert(userEmail, { category: b.category, percentUsed: pct, limit, spent });
        break;
      }
    }
  }

  const { data: goals } = await supabase.from('goals').select('name, current_amount, target_amount').eq('user_id', userId);
  if (goalAchieved && goals?.length) {
    const achieved = goals.find((g) => Number(g.current_amount) >= Number(g.target_amount) && Number(g.target_amount) > 0);
    if (achieved) {
      await sendGoalAchieved(userEmail, {
        goalName: achieved.name,
        amount: Number(achieved.current_amount),
        nextSteps: 'Defina sua próxima meta no app!',
      });
    }
  }

  if (weeklyReport && transactions?.length) {
    const income = (transactions || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = (transactions || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const byCat: Record<string, number> = {};
    (transactions || []).filter((t) => t.type === 'expense').forEach((t) => {
      byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount);
    });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    await sendWeeklyReport(userEmail, {
      income,
      expense,
      topCategory: top?.[0] || '—',
      topAmount: top?.[1] || 0,
    });
  }

  if (monthlyPlan) {
    await sendMonthlyPlan(userEmail, {
      plan: 'Acompanhe suas metas e gastos no app.',
      summary: 'Seu resumo do mês.',
    });
  }

  await supabase.from('email_logs').insert({
    user_id: userId,
    type: 'alerts_check',
    subject: 'Alertas enviados',
    meta: { date: today }
  });
}
