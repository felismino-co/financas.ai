import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API = 'https://api.resend.com/emails';
const APP_URL = 'https://financas-ai-ivory.vercel.app';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const baseStyles = `
  font-family: system-ui, -apple-system, sans-serif;
  background: #0F0F1A;
  color: #F8F8F8;
  margin: 0;
  padding: 0;
`;

function footer() {
  return `<p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #333;padding-top:16px;">
    FinanceIA — Seu coach financeiro com IA<br>
    <a href="${APP_URL}/profile" style="color:#00D4AA;">Cancelar notificações</a>
  </p>`;
}

function templateBudgetAlert(data: { category: string; percentUsed: number; limit: number; spent: number }) {
  const urgent = data.percentUsed >= 100;
  const bg = urgent ? '#7f1d1d' : '#991b1b';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Alerta de orçamento</title></head>
<body style="${baseStyles} padding:24px;max-width:600px;margin:0 auto;">
  <div style="background:#1a1a2e;border-radius:12px;padding:24px;border:1px solid #333;">
    <h1 style="color:#00D4AA;margin:0 0 16px 0;font-size:20px;">FinanceIA</h1>
    <h2 style="margin:0 0 16px 0;font-size:18px;">⚠️ Alerta de orçamento</h2>
    <div style="background:${bg};border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px 0;font-weight:bold;">${data.category}</p>
      <p style="margin:0;font-size:24px;font-weight:bold;">${data.percentUsed}% usado</p>
      <p style="margin:8px 0 0 0;font-size:14px;opacity:0.9;">R$ ${data.spent.toLocaleString('pt-BR')} de R$ ${data.limit.toLocaleString('pt-BR')}</p>
    </div>
    <a href="${APP_URL}/budget" style="display:inline-block;background:#00D4AA;color:#0F0F1A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver no app</a>
    ${footer()}
  </div>
</body>
</html>`;
}

function templateWeeklyReport(data: { income: number; expense: number; topCategory: string; topAmount: number }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Resumo semanal</title></head>
<body style="${baseStyles} padding:24px;max-width:600px;margin:0 auto;">
  <div style="background:#1a1a2e;border-radius:12px;padding:24px;border:1px solid #333;">
    <h1 style="color:#00D4AA;margin:0 0 16px 0;font-size:20px;">FinanceIA</h1>
    <h2 style="margin:0 0 16px 0;font-size:18px;">📊 Resumo da semana</h2>
    <div style="display:flex;gap:16px;margin:16px 0;">
      <div style="flex:1;background:#166534;border-radius:8px;padding:16px;">
        <p style="margin:0;font-size:12px;opacity:0.9;">Receitas</p>
        <p style="margin:4px 0 0 0;font-size:20px;font-weight:bold;">R$ ${data.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
      <div style="flex:1;background:#991b1b;border-radius:8px;padding:16px;">
        <p style="margin:0;font-size:12px;opacity:0.9;">Despesas</p>
        <p style="margin:4px 0 0 0;font-size:20px;font-weight:bold;">R$ ${data.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
    </div>
    <p style="margin:16px 0;">Top gasto: <strong>${data.topCategory}</strong> — R$ ${data.topAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
    <a href="${APP_URL}/dashboard" style="display:inline-block;background:#00D4AA;color:#0F0F1A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver no app</a>
    ${footer()}
  </div>
</body>
</html>`;
}

function templateGoalAchieved(data: { goalName: string; amount: number; nextSteps?: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Meta atingida!</title></head>
<body style="${baseStyles} padding:24px;max-width:600px;margin:0 auto;">
  <div style="background:#1a1a2e;border-radius:12px;padding:24px;border:1px solid #333;text-align:center;">
    <h1 style="color:#00D4AA;margin:0 0 16px 0;font-size:20px;">FinanceIA</h1>
    <p style="font-size:48px;margin:0 0 16px 0;">🎉</p>
    <h2 style="margin:0 0 16px 0;font-size:22px;">Meta atingida!</h2>
    <p style="font-size:18px;margin:0 0 8px 0;"><strong>${data.goalName}</strong></p>
    <p style="font-size:24px;color:#00D4AA;margin:0 0 16px 0;">R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
    ${data.nextSteps ? `<p style="margin:16px 0;font-size:14px;opacity:0.9;">${data.nextSteps}</p>` : ''}
    <a href="${APP_URL}/goals" style="display:inline-block;background:#00D4AA;color:#0F0F1A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver metas</a>
    ${footer()}
  </div>
</body>
</html>`;
}

function templateMonthlyPlan(data: { plan: string; summary: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Plano do mês</title></head>
<body style="${baseStyles} padding:24px;max-width:600px;margin:0 auto;">
  <div style="background:#1a1a2e;border-radius:12px;padding:24px;border:1px solid #333;">
    <h1 style="color:#00D4AA;margin:0 0 16px 0;font-size:20px;">FinanceIA</h1>
    <h2 style="margin:0 0 16px 0;font-size:18px;">📋 Plano do mês</h2>
    <p style="margin:0 0 16px 0;font-size:14px;opacity:0.9;">${data.summary}</p>
    <div style="background:#1f2937;border-radius:8px;padding:16px;margin:16px 0;white-space:pre-wrap;">${data.plan}</div>
    <a href="${APP_URL}/insights" style="display:inline-block;background:#00D4AA;color:#0F0F1A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver no app</a>
    ${footer()}
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = req.headers.get('Authorization');
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const token = auth.replace('Bearer ', '');
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let body: { type?: string; to?: string; data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { type, to, data = {} } = body;
  if (!type || !to) {
    return new Response(JSON.stringify({ error: 'Missing type or to' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let subject = 'FinanceIA';
  let html = '';

  switch (type) {
    case 'budget_alert': {
      const d = data as { category?: string; percentUsed?: number; limit?: number; spent?: number };
      subject = `⚠️ Alerta: ${d.category || 'Orçamento'} em ${d.percentUsed ?? 0}%`;
      html = templateBudgetAlert({
        category: d.category || 'Orçamento',
        percentUsed: d.percentUsed ?? 0,
        limit: d.limit ?? 0,
        spent: d.spent ?? 0,
      });
      break;
    }
    case 'weekly_report': {
      const d = data as { income?: number; expense?: number; topCategory?: string; topAmount?: number };
      subject = '📊 Resumo semanal - FinanceIA';
      html = templateWeeklyReport({
        income: d.income ?? 0,
        expense: d.expense ?? 0,
        topCategory: d.topCategory || '—',
        topAmount: d.topAmount ?? 0,
      });
      break;
    }
    case 'goal_achieved': {
      const d = data as { goalName?: string; amount?: number; nextSteps?: string };
      subject = '🎉 Meta atingida!';
      html = templateGoalAchieved({
        goalName: d.goalName || 'Meta',
        amount: d.amount ?? 0,
        nextSteps: d.nextSteps,
      });
      break;
    }
    case 'monthly_plan': {
      const d = data as { plan?: string; summary?: string };
      subject = '📋 Plano do mês - FinanceIA';
      html = templateMonthlyPlan({
        plan: d.plan || '—',
        summary: d.summary || 'Seu plano personalizado para o mês.',
      });
      break;
    }
    case 'bills_reminder': {
      const d = data as { bills?: { description: string; amount: number; due_day: number }[] };
      const list = (d.bills || []).map((b) => `<li>${b.description} — R$ ${b.amount.toLocaleString('pt-BR')} (dia ${b.due_day})</li>`).join('');
      subject = '📋 Contas a vencer - FinanceIA';
      html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${baseStyles} padding:24px;max-width:600px;margin:0 auto;">
  <div style="background:#1a1a2e;border-radius:12px;padding:24px;border:1px solid #333;">
    <h1 style="color:#00D4AA;margin:0 0 16px 0;">FinanceIA</h1>
    <h2 style="margin:0 0 16px 0;">Contas a vencer</h2>
    <ul style="margin:16px 0;">${list || '<li>Nenhuma</li>'}</ul>
    <a href="${APP_URL}/bills" style="display:inline-block;background:#00D4AA;color:#0F0F1A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver no app</a>
    ${footer()}
  </div>
</body>
</html>`;
      break;
    }
    default:
      return new Response(JSON.stringify({ error: 'Unknown type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: 'FinanceIA <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });

  const resData = await res.json().catch(() => ({}));
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  await supabaseAdmin.from('email_logs').insert({
    user_id: user.id,
    type,
    subject,
    meta: { ...data, resend_id: resData.id, status: res.status },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: resData.message || 'Resend error' }), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true, id: resData.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
