/**
 * Cliente de email via Supabase Edge Function (Resend).
 * Templates são gerados no backend.
 */
import { supabase } from '@/lib/supabase';

export type EmailType = 'budget_alert' | 'weekly_report' | 'goal_achieved' | 'monthly_plan';

export async function sendBudgetAlert(
  to: string,
  data: { category: string; percentUsed: number; limit: number; spent: number }
): Promise<{ ok: boolean; error?: string }> {
  return invokeSendEmail(to, 'budget_alert', data);
}

export async function sendWeeklyReport(
  to: string,
  data: { income: number; expense: number; topCategory: string; topAmount: number }
): Promise<{ ok: boolean; error?: string }> {
  return invokeSendEmail(to, 'weekly_report', data);
}

export async function sendGoalAchieved(
  to: string,
  data: { goalName: string; amount: number; nextSteps?: string }
): Promise<{ ok: boolean; error?: string }> {
  return invokeSendEmail(to, 'goal_achieved', data);
}

export async function sendMonthlyPlan(
  to: string,
  data: { plan: string; summary: string }
): Promise<{ ok: boolean; error?: string }> {
  return invokeSendEmail(to, 'monthly_plan', data);
}

async function invokeSendEmail(
  to: string,
  type: EmailType,
  data: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: res, error } = await supabase.functions.invoke('send-email', {
      body: { type, to, data },
    });
    if (error) return { ok: false, error: error.message };
    if (res?.error) return { ok: false, error: res.error };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao enviar email' };
  }
}
