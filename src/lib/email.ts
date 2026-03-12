/**
 * Cliente de email via Supabase Edge Function (Resend).
 * O envio real é feito no backend para não expor a API key.
 */
import { supabase } from '@/lib/supabase';

export type EmailType = 'weekly_digest' | 'bills_reminder' | 'goal_achieved' | 'budget_alert';

export interface SendEmailParams {
  to: string;
  type: EmailType;
  subject: string;
  html: string;
  meta?: Record<string, unknown>;
}

export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: params.to,
        type: params.type,
        subject: params.subject,
        html: params.html,
        meta: params.meta ?? {},
      },
    });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao enviar email' };
  }
}
