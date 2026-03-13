/**
 * FinanceIA — Notificações proativas WhatsApp
 * Chamada pelo cron job (whatsapp-cron) ou diretamente.
 * Envia lembretes de contas, recebimentos, resumo semanal e lembrete diário.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const ZAPI_BASE = 'https://api.z-api.io';
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function formatPhone(phone: string): string {
  const digits = phone.replace(/[\s\-+()]/g, '').replace(/\D/g, '');
  return digits.length >= 10 ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
}

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function getNextDueDate(dueDay: number): Date {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  let due = new Date(now.getFullYear(), now.getMonth(), day);
  if (due <= now) {
    const nextLast = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
    due = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(dueDay, nextLast));
  }
  return due;
}

function daysUntil(d: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d2 = new Date(d);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

async function sendZApi(instanceId: string, token: string, phone: string, message: string): Promise<boolean> {
  const formatted = formatPhone(phone);
  if (!formatted) return false;
  try {
    const res = await fetch(`${ZAPI_BASE}/instances/${instanceId}/token/${token}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: formatted, message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function callGemini(prompt: string): Promise<string> {
  const key = Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('VITE_GEMINI_API_KEY');
  if (!key) return '';
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 256 },
      }),
    });
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  } catch {
    return '';
  }
}

interface UserRow {
  id: string;
  name: string;
  phone_number: string | null;
  whatsapp_preferences: Record<string, boolean> | null;
}

interface BillRow {
  id: string;
  description: string;
  amount: number;
  due_day: number;
  paid_at: string | null;
}

interface ReceivableRow {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  status: string;
}

export async function runNotifications(mode: '8h' | '21h') {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const instanceId = Deno.env.get('ZAPI_INSTANCE_ID') ?? Deno.env.get('VITE_ZAPI_INSTANCE_ID');
  const token = Deno.env.get('ZAPI_TOKEN') ?? Deno.env.get('VITE_ZAPI_TOKEN');
  if (!instanceId || !token) return { error: 'Z-API not configured' };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const isMonday = today.getDay() === 1;

  const { data: users } = await supabase
    .from('profiles')
    .select('id, name, phone_number, whatsapp_preferences')
    .eq('whatsapp_connected', true)
    .not('phone_number', 'is', null);

  if (!users?.length) return { sent: 0 };

  const prefs = (p: UserRow) => ({
    bill7: p.whatsapp_preferences?.whatsapp_7days !== false,
    bill3: p.whatsapp_preferences?.whatsapp_3days !== false,
    billDay: p.whatsapp_preferences?.whatsapp_due_day !== false,
    recv: p.whatsapp_preferences?.whatsapp_receivables !== false,
    weekly: p.whatsapp_preferences?.whatsapp_weekly_summary !== false,
    daily: p.whatsapp_preferences?.whatsapp_daily_reminder === true,
    tip: p.whatsapp_preferences?.whatsapp_weekly_tip !== false,
  });

  let sent = 0;

  for (const user of users as UserRow[]) {
    const phone = user.phone_number;
    if (!phone) continue;

    const pref = prefs(user);

    if (mode === '21h') {
      if (!pref.daily) continue;
      const { count } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'daily_reminder')
        .gte('sent_at', dayStart);
      if ((count ?? 0) > 0) continue;

      const msg = `🌙 *Como foi seu dia financeiro?*\nRegistre seus gastos de hoje:\nBasta digitar: *gastei [valor] em [categoria]*`;
      const ok = await sendZApi(instanceId, token, phone, msg);
      if (ok) {
        await supabase.from('notification_log').insert({
          user_id: user.id,
          type: 'daily_reminder',
          reference_id: null,
          message_preview: msg.slice(0, 100),
        });
        sent++;
      }
      await new Promise((r) => setTimeout(r, 1100));
      continue;
    }

    // mode === '8h': bills, receivables, weekly summary
    const { data: bills } = await supabase
      .from('bills')
      .select('id, description, amount, due_day, paid_at')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .is('paid_at', null);

    const billsByDays = { d7: [] as BillRow[], d3: [] as BillRow[], d1: [] as BillRow[], d0: [] as BillRow[] };
    for (const b of (bills || []) as BillRow[]) {
      const due = getNextDueDate(b.due_day);
      const days = daysUntil(due);
      if (days === 7) billsByDays.d7.push(b);
      else if (days === 3) billsByDays.d3.push(b);
      else if (days === 1) billsByDays.d1.push(b);
      else if (days === 0) billsByDays.d0.push(b);
    }

    const { data: receivables } = await supabase
      .from('receivables')
      .select('id, description, amount, due_date, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .not('due_date', 'is', null);

    const recvByDays = { d7: [] as ReceivableRow[], d3: [] as ReceivableRow[], d0: [] as ReceivableRow[] };
    for (const r of (receivables || []) as ReceivableRow[]) {
      if (!r.due_date) continue;
      const due = new Date(r.due_date);
      const days = daysUntil(due);
      if (days <= 7 && days > 3) recvByDays.d7.push(r);
      else if (days <= 3 && days > 0) recvByDays.d3.push(r);
      else if (days === 0) recvByDays.d0.push(r);
    }

    const dayName = (d: Date) => WEEKDAYS[d.getDay()];

    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

    // Bills 7 days — uma mensagem com todas as contas
    if (pref.bill7 && billsByDays.d7.length > 0) {
      const { count } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'bill_7days')
        .gte('sent_at', dayStart);
      if ((count ?? 0) === 0) {
        const lines = billsByDays.d7.map((x) => `- 📌 ${x.description} — R$${formatBrl(Number(x.amount))} (vence em 7 dias)`).join('\n');
        const total = billsByDays.d7.reduce((s, x) => s + Number(x.amount), 0);
        const msg = `📅 *Lembrete FinanceIA*\nVocê tem contas chegando essa semana:\n\n${lines}\n\nTotal: R$${formatBrl(total)}\nResponda *paguei [nome]* quando quitar! ✅`;
        const ok = await sendZApi(instanceId, token, phone, msg);
        if (ok) {
          await supabase.from('notification_log').insert({ user_id: user.id, type: 'bill_7days', reference_id: null, message_preview: msg.slice(0, 100) });
          sent++;
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    // Bills 3 days
    if (pref.bill3 && billsByDays.d3.length > 0) {
      const { count } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'bill_3days')
        .gte('sent_at', dayStart);
      if ((count ?? 0) === 0) {
        const lines = billsByDays.d3
          .map((x) => {
            const d = getNextDueDate(x.due_day);
            return `- 🔶 ${x.description} — R$${formatBrl(Number(x.amount))} (${dayName(d)})`;
          })
          .join('\n');
        const total = billsByDays.d3.reduce((s, x) => s + Number(x.amount), 0);
        const msg = `⚠️ *Atenção — Contas em 3 dias!*\n\n${lines}\n\nTotal: R$${formatBrl(total)}\nNão deixe passar! 💪`;
        const ok = await sendZApi(instanceId, token, phone, msg);
        if (ok) {
          await supabase.from('notification_log').insert({ user_id: user.id, type: 'bill_3days', reference_id: null, message_preview: msg.slice(0, 100) });
          sent++;
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    // Bills 1 day
    if (pref.billDay && billsByDays.d1.length > 0) {
      const { count } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'bill_1day')
        .gte('sent_at', dayStart);
      if ((count ?? 0) === 0) {
        const lines = billsByDays.d1.map((b) => `- 🔴 ${b.description} — R$${formatBrl(Number(b.amount))} — AMANHÃ`).join('\n');
        const msg = `🚨 *AMANHÃ tem conta vencendo!*\n\n${lines}\nResponda *paguei [nome]* para marcar como pago ✅`;
        const ok = await sendZApi(instanceId, token, phone, msg);
        if (ok) {
          await supabase.from('notification_log').insert({ user_id: user.id, type: 'bill_1day', reference_id: null, message_preview: msg.slice(0, 100) });
          sent++;
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    // Bills due today
    if (pref.billDay && billsByDays.d0.length > 0) {
      const { count } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'bill_due_day')
        .gte('sent_at', dayStart);
      if ((count ?? 0) === 0) {
        const lines = billsByDays.d0.map((b) => `- ❗ ${b.description} — R$${formatBrl(Number(b.amount))}`).join('\n');
        const msg = `🔴 *Vence HOJE!*\n\n${lines}\n\nResponda *paguei [nome]* para confirmar o pagamento ✅`;
        const ok = await sendZApi(instanceId, token, phone, msg);
        if (ok) {
          await supabase.from('notification_log').insert({ user_id: user.id, type: 'bill_due_day', reference_id: null, message_preview: msg.slice(0, 100) });
          sent++;
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    // Receivables 7 days
    if (pref.recv && recvByDays.d7.length > 0) {
      const lines = recvByDays.d7
        .map((r) => {
          const days = r.due_date ? daysUntil(new Date(r.due_date)) : 0;
          return `- ${r.description} — R$${formatBrl(Number(r.amount))} (${days} dias)`;
        })
        .join('\n');
      const total = recvByDays.d7.reduce((s, x) => s + Number(x.amount), 0);
      const msg = `💰 *A Receber essa semana — FinanceIA*\n\nVocê tem pagamentos chegando:\n${lines}\n\nTotal a receber: R$${formatBrl(total)} 🎉`;

      const { count } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'recv_7days')
        .gte('sent_at', dayStart);
      if ((count ?? 0) === 0) {
        const ok = await sendZApi(instanceId, token, phone, msg);
        if (ok) {
          await supabase.from('notification_log').insert({
            user_id: user.id,
            type: 'recv_7days',
            reference_id: null,
            message_preview: msg.slice(0, 100),
          });
          sent++;
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    // Receivables 3 days
    if (pref.recv && recvByDays.d3.length > 0) {
      const lines = recvByDays.d3.map((r) => `- ${r.description} — R$${formatBrl(Number(r.amount))}`).join('\n');
      const msg = `💸 *Chegando em 3 dias!*\n${lines}\nFique de olho na conta! 👀`;

      const { count } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'recv_3days')
        .gte('sent_at', dayStart);
      if ((count ?? 0) === 0) {
        const ok = await sendZApi(instanceId, token, phone, msg);
        if (ok) {
          await supabase.from('notification_log').insert({
            user_id: user.id,
            type: 'recv_3days',
            reference_id: null,
            message_preview: msg.slice(0, 100),
          });
          sent++;
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    // Receivables today
    if (pref.recv && recvByDays.d0.length > 0) {
      const lines = recvByDays.d0.map((r) => `- ${r.description} — R$${formatBrl(Number(r.amount))}`).join('\n');
      const msg = `🎉 *Hoje você recebe!*\n${lines}\nRecebeu? Responda *recebi [descrição]* ✅`;

      const { count } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'recv_today')
        .gte('sent_at', dayStart);
      if ((count ?? 0) === 0) {
        const ok = await sendZApi(instanceId, token, phone, msg);
        if (ok) {
          await supabase.from('notification_log').insert({
            user_id: user.id,
            type: 'recv_today',
            reference_id: null,
            message_preview: msg.slice(0, 100),
          });
          sent++;
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    // Weekly summary (segunda 8h)
    if (isMonday && pref.weekly) {
      const { count } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'weekly_summary')
        .gte('sent_at', dayStart);
      if ((count ?? 0) > 0) continue;

      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 1).toISOString().split('T')[0];
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 7).toISOString().split('T')[0];

      const { data: tx } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end);
      const income = (tx || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = (tx || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

      const { data: billsWeek } = await supabase
        .from('bills')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .is('paid_at', null);
      const billsTotal = (billsWeek || []).reduce((s, b) => s + Number(b.amount), 0);

      const { data: recvWeek } = await supabase
        .from('receivables')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      const recvTotal = (recvWeek || []).reduce((s, r) => s + Number(r.amount), 0);

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      const { data: txMonth } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd);
      const monthIncome = (txMonth || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const monthExpense = (txMonth || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const saldo = monthIncome - monthExpense;

      const { data: goals } = await supabase
        .from('goals')
        .select('name, target_amount, current_amount')
        .eq('user_id', user.id);
      const goalsLines = (goals || []).map((g) => {
        const pct = Number(g.target_amount) > 0 ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
        const bar = pct >= 100 ? '██████████' : '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
        return `- ${g.name}: ${bar} ${pct}%`;
      }).join('\n');

      let tip = '';
      if (pref.tip) {
        tip = await callGemini(
          `Dê UMA dica financeira curta e personalizada (máx 2 linhas) para alguém com saldo R$${formatBrl(saldo)}, metas: ${(goals || []).map((g) => g.name).join(', ')}. Seja motivador e use emojis.`
        );
        if (tip) tip = `\n\n💡 *Dica da semana:*\n${tip}`;
      }

      const msg = `📊 *Sua semana financeira — FinanceIA*\n\nOlá ${user.name || 'usuário'}! Aqui está seu resumo:\n\n📅 *Esta semana:*\n💸 A pagar: R$${formatBrl(billsTotal)} (${billsWeek?.length ?? 0} contas)\n💰 A receber: R$${formatBrl(recvTotal)} (${recvWeek?.length ?? 0} itens)\n💰 Saldo atual: R$${formatBrl(saldo)}\n\n🎯 *Suas metas:*\n${goalsLines || 'Nenhuma meta ativa'}${tip}\n\nResponda *ajuda* para ver os comandos 📱`;

      const ok = await sendZApi(instanceId, token, phone, msg);
      if (ok) {
        await supabase.from('notification_log').insert({
          user_id: user.id,
          type: 'weekly_summary',
          reference_id: null,
          message_preview: msg.slice(0, 100),
        });
        sent++;
      }
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return { sent };
}

// HTTP handler para chamada direta ou pelo cron
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = req.headers.get('Authorization');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key || auth !== `Bearer ${key}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const url = new URL(req.url);
  const mode = (url.searchParams.get('mode') || '8h') as '8h' | '21h';
  try {
    const result = await runNotifications(mode);
    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
