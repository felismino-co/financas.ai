/**
 * FinanceIA — Webhook WhatsApp (Z-API)
 * Assistente financeiro completo: comandos de registro, consulta e Gemini para mensagens livres.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APP_URL = 'https://financas-ai-ivory.vercel.app';
const ZAPI_BASE = 'https://api.z-api.io';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const EXPENSE_CATEGORIES = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Assinaturas', 'Roupas', 'Outros'];
const INCOME_CATEGORIES = ['Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros'];

const CATEGORY_ALIASES: Record<string, string> = {
  almoço: 'Alimentação', almoco: 'Alimentação', mercado: 'Alimentação', comida: 'Alimentação', restaurante: 'Alimentação', ifood: 'Alimentação',
  aluguel: 'Moradia', luz: 'Moradia', energia: 'Moradia', água: 'Moradia', agua: 'Moradia', condomínio: 'Moradia', condominio: 'Moradia',
  uber: 'Transporte', gasolina: 'Transporte', combustível: 'Transporte', combustivel: 'Transporte', ônibus: 'Transporte', onibus: 'Transporte',
  saúde: 'Saúde', saude: 'Saúde', farmácia: 'Saúde', farmacia: 'Saúde', médico: 'Saúde', medico: 'Saúde',
  curso: 'Educação', educação: 'Educação', educacao: 'Educação', livro: 'Educação',
  cinema: 'Lazer', lazer: 'Lazer', jogos: 'Lazer', netflix: 'Assinaturas', spotify: 'Assinaturas', assinatura: 'Assinaturas',
  roupa: 'Roupas', roupas: 'Roupas',
};

const SCORE_LEVELS = [
  { min: 0, max: 100, label: 'Iniciante', emoji: '🌱' },
  { min: 101, max: 250, label: 'Aprendiz', emoji: '💡' },
  { min: 251, max: 500, label: 'Organizado', emoji: '⚡' },
  { min: 501, max: 750, label: 'Estrategista', emoji: '🎯' },
  { min: 751, max: 950, label: 'Expert', emoji: '💎' },
  { min: 951, max: 1000, label: 'Mestre Financeiro', emoji: '👑' },
];

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? (digits.startsWith('55') ? digits : `55${digits}`) : phone;
}

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function progressBar(pct: number): string {
  const v = Math.min(100, Math.max(0, pct));
  const filled = Math.floor(v / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${Math.round(v)}%`;
}

function getScoreLevel(score: number): (typeof SCORE_LEVELS)[number] {
  const s = Math.max(0, Math.min(1000, score));
  for (let i = SCORE_LEVELS.length - 1; i >= 0; i--) {
    if (s >= SCORE_LEVELS[i].min) return SCORE_LEVELS[i];
  }
  return SCORE_LEVELS[0];
}

function extractMessage(body: Record<string, unknown>): string | null {
  const text = (body.text as { message?: string })?.message ?? (body.body as string) ?? (body.message as { text?: string })?.text ?? '';
  return typeof text === 'string' ? text.trim() : null;
}

function extractPhone(body: Record<string, unknown>): string | null {
  const raw = (body.phone as string) ?? (body.from as string) ?? (body.sender as string) ?? '';
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

async function sendReply(instanceId: string, token: string, phone: string, message: string): Promise<void> {
  const ph = formatPhone(phone);
  await fetch(`${ZAPI_BASE}/instances/${instanceId}/token/${token}/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: ph.startsWith('55') ? ph : `55${ph}`, message }),
  });
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
        generationConfig: { maxOutputTokens: 512 },
      }),
    });
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  } catch {
    return '';
  }
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = a.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const nb = b.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return na.includes(nb) || nb.includes(na);
}

interface ParsedTx {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
}

function parseGastei(text: string): ParsedTx | null {
  const m = text.match(/gastei\s+(\d+(?:[.,]\d+)?)\s+(?:em|no|na)\s+(.+)/i);
  if (!m) return null;
  const amount = parseFloat(m[1].replace(',', '.'));
  if (amount <= 0) return null;
  const catRaw = m[2].trim().toLowerCase();
  const category = CATEGORY_ALIASES[catRaw] ?? EXPENSE_CATEGORIES.find((c) => fuzzyMatch(c, catRaw)) ?? 'Outros';
  return { type: 'expense', amount, category, description: `Gasto: ${m[2].trim()}` };
}

function parseRecebiIncome(text: string): ParsedTx | null {
  const m = text.match(/recebi\s+(\d+(?:[.,]\d+)?)\s*(.+)?/i);
  if (!m) return null;
  const amount = parseFloat(m[1].replace(',', '.'));
  if (amount <= 0) return null;
  const desc = (m[2] || 'Salário').trim();
  const category = INCOME_CATEGORIES.find((c) => fuzzyMatch(c, desc)) ?? (desc ? 'Outros' : 'Salário');
  return { type: 'income', amount, category, description: desc || 'Receita' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const instanceId = Deno.env.get('VITE_ZAPI_INSTANCE_ID') ?? Deno.env.get('ZAPI_INSTANCE_ID');
  const token = Deno.env.get('VITE_ZAPI_TOKEN') ?? Deno.env.get('ZAPI_TOKEN');
  if (!instanceId || !token) {
    return new Response(JSON.stringify({ error: 'Z-API not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (body.fromMe === true) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const message = extractMessage(body);
  const phone = extractPhone(body);
  if (!message || !phone) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const normalized = phone.replace(/^55/, '');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, plan_type, score, financial_score')
    .or(`phone_number.eq.${phone},phone_number.eq.${normalized},phone_number.eq.55${normalized}`)
    .limit(1);
  const profile = profiles?.[0] as { id: string; name?: string; plan_type?: string; score?: number; financial_score?: number } | undefined;

  if (!profile) {
    await sendReply(instanceId, token, phone, `❌ Número não vinculado. Acesse ${APP_URL} para conectar seu WhatsApp.`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const cmd = message.toLowerCase().trim();

  if (cmd === 'conectar' || cmd === 'link' || cmd === 'vincular') {
    await supabase.from('profiles').update({ whatsapp_connected: true }).eq('id', profile.id);
    await sendReply(instanceId, token, phone, '✅ Conectado! Envie "ajuda" para ver os comandos.');
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // paguei [nome] — marca bill como pago
  const pagueiMatch = message.match(/^paguei\s+(.+)$/i);
  if (pagueiMatch) {
    const search = pagueiMatch[1].trim();
    if (!/^\d+([.,]\d+)?$/.test(search)) {
      const { data: bills } = await supabase
        .from('bills')
        .select('id, description, amount')
        .eq('user_id', profile.id)
        .eq('type', 'expense')
        .is('paid_at', null);
      const bill = (bills || []).find((b) => fuzzyMatch(b.description, search));
      if (bill) {
        await supabase.from('bills').update({ paid_at: new Date().toISOString() }).eq('id', bill.id);
        const { count } = await supabase.from('bills').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('type', 'expense').is('paid_at', null);
        await sendReply(
          instanceId,
          token,
          phone,
          `✅ ${bill.description} marcado como pago!\n💸 R$${formatBrl(Number(bill.amount))} quitado\n📋 Você ainda tem ${count ?? 0} contas esse mês`
        );
      } else {
        await sendReply(instanceId, token, phone, `❌ Não encontrei conta com nome "${search}". Verifique e tente novamente.`);
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // recebi [descrição] — marca receivable como recebido (não é "recebi 3000 salário")
  const recebiDescMatch = message.match(/^recebi\s+(.+)$/i);
  if (recebiDescMatch) {
    const search = recebiDescMatch[1].trim();
    if (!/^\d+([.,]\d+)?\s*/.test(search)) {
      const { data: recv } = await supabase
        .from('receivables')
        .select('id, description, amount')
        .eq('user_id', profile.id)
        .eq('status', 'pending');
      const rec = (recv || []).find((r) => fuzzyMatch(r.description, search));
      if (rec) {
        await supabase.from('receivables').update({ status: 'received', received_at: new Date().toISOString() }).eq('id', rec.id);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        const { data: tx } = await supabase.from('transactions').select('type, amount').eq('user_id', profile.id).gte('date', start).lte('date', end);
        const totalIncome = (tx || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        await sendReply(
          instanceId,
          token,
          phone,
          `🎉 ${rec.description} marcado como recebido!\n💰 R$${formatBrl(Number(rec.amount))} recebido\n📈 Total recebido no mês: R$${formatBrl(totalIncome)}`
        );
      } else {
        await sendReply(instanceId, token, phone, `❌ Não encontrei recebimento com descrição "${search}".`);
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // gastei X em Y
  const gasteiParsed = parseGastei(message);
  if (gasteiParsed) {
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('transactions').insert({
      user_id: profile.id,
      family_id: null,
      description: gasteiParsed.description,
      amount: gasteiParsed.amount,
      type: 'expense',
      category: gasteiParsed.category,
      date: today,
      recurring: false,
      frequency: null,
      notes: 'Via WhatsApp',
    });
    const { data: budgets } = await supabase.from('budgets').select('category, limit_amount').eq('user_id', profile.id).eq('month', new Date().getMonth() + 1).eq('year', new Date().getFullYear());
    const budget = budgets?.find((b) => b.category === gasteiParsed.category);
    const { data: tx } = await supabase.from('transactions').select('amount').eq('user_id', profile.id).eq('type', 'expense').eq('category', gasteiParsed.category).gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const spent = (tx || []).reduce((s, t) => s + Number(t.amount), 0);
    const limit = budget ? Number(budget.limit_amount) : 0;
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const { data: txAll } = await supabase.from('transactions').select('type, amount').eq('user_id', profile.id).gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]).lte('date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
    const income = (txAll || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = (txAll || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const balance = income - expense;
    let reply = `✅ Registrado!\n${getCategoryEmoji(gasteiParsed.category)} ${gasteiParsed.category}: R$${formatBrl(gasteiParsed.amount)}\n💰 Saldo disponível: R$${formatBrl(balance)}`;
    if (limit > 0) reply += `\n📊 ${pct}% do orçamento de ${gasteiParsed.category} usado`;
    await sendReply(instanceId, token, phone, reply);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // recebi X salário
  const recebiParsed = parseRecebiIncome(message);
  if (recebiParsed) {
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('transactions').insert({
      user_id: profile.id,
      family_id: null,
      description: recebiParsed.description,
      amount: recebiParsed.amount,
      type: 'income',
      category: recebiParsed.category,
      date: today,
      recurring: false,
      frequency: null,
      notes: 'Via WhatsApp',
    });
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data: tx } = await supabase.from('transactions').select('amount').eq('user_id', profile.id).eq('type', 'income').gte('date', start).lte('date', end);
    const totalIncome = (tx || []).reduce((s, t) => s + Number(t.amount), 0);
    await sendReply(instanceId, token, phone, `💰 Receita registrada!\n✅ ${recebiParsed.category}: R$${formatBrl(recebiParsed.amount)}\n📈 Total recebido no mês: R$${formatBrl(totalIncome)}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // gastei X (sem categoria) — fallback
  const gasteiSimple = message.match(/gastei\s+(\d+(?:[.,]\d+)?)/i);
  if (gasteiSimple) {
    const amount = parseFloat(gasteiSimple[1].replace(',', '.'));
    if (amount > 0) {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('transactions').insert({
        user_id: profile.id,
        family_id: null,
        description: message.slice(0, 100),
        amount,
        type: 'expense',
        category: 'Outros',
        date: today,
        recurring: false,
        frequency: null,
        notes: 'Via WhatsApp',
      });
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const { data: tx } = await supabase.from('transactions').select('type, amount').eq('user_id', profile.id).gte('date', start).lte('date', end);
      const income = (tx || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = (tx || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      await sendReply(instanceId, token, phone, `✅ Registrado!\n🍽️ Outros: R$${formatBrl(amount)}\n💰 Saldo disponível: R$${formatBrl(income - expense)}`);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // Comandos de consulta
  if (cmd === 'saldo' || cmd === 'quanto tenho') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data: tx } = await supabase.from('transactions').select('type, amount').eq('user_id', profile.id).gte('date', start).lte('date', end);
    const income = (tx || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = (tx || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const balance = income - expense;
    const score = Number(profile.score ?? profile.financial_score ?? 0);
    const level = getScoreLevel(score);
    const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
    await sendReply(
      instanceId,
      token,
      phone,
      `💰 *Seu saldo em ${monthName}:*\n📈 Receitas: R$${formatBrl(income)}\n📉 Gastos: R$${formatBrl(expense)}\n💚 Disponível: R$${formatBrl(balance)}\n\n📊 Score financeiro: ${score} pts (${level.emoji} ${level.label})`
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (cmd === 'contas' || cmd === 'o que vence') {
    const { data: bills } = await supabase.from('bills').select('id, description, amount, due_day, paid_at').eq('user_id', profile.id).eq('type', 'expense');
    const unpaid = (bills || []).filter((b) => !b.paid_at);
    const today = new Date().getDate();
    const todayBills = unpaid.filter((b) => b.due_day === today);
    const weekBills = unpaid.filter((b) => {
      const d = b.due_day;
      const diff = d >= today ? d - today : 31 - today + d;
      return diff > 0 && diff <= 7;
    });
    const monthBills = unpaid.filter((b) => b.due_day !== today && !weekBills.includes(b));
    const fmt = (list: typeof unpaid) => list.map((b) => `• ${b.description} — R$${formatBrl(Number(b.amount))} (dia ${b.due_day})`).join('\n') || 'Nenhuma';
    const total = unpaid.reduce((s, b) => s + Number(b.amount), 0);
    await sendReply(
      instanceId,
      token,
      phone,
      `📋 *Suas próximas contas:*\n🔴 Vence hoje: ${todayBills.length ? fmt(todayBills) : 'Nenhuma'}\n🟡 Esta semana: ${weekBills.length ? fmt(weekBills) : 'Nenhuma'}\n🟢 Este mês: ${monthBills.length ? fmt(monthBills) : 'Nenhuma'}\n\nTotal pendente: R$${formatBrl(total)}`
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (cmd === 'a receber' || cmd === 'o que vou receber') {
    const { data: recv } = await supabase.from('receivables').select('description, amount, due_date').eq('user_id', profile.id).eq('status', 'pending').not('due_date', 'is', null);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecv = (recv || []).filter((r) => r.due_date === todayStr);
    const weekRecv = (recv || []).filter((r) => {
      if (!r.due_date) return false;
      const d = new Date(r.due_date);
      const t = new Date();
      const diff = Math.ceil((d.getTime() - t.getTime()) / (24 * 60 * 60 * 1000));
      return diff > 0 && diff <= 7;
    });
    const monthRecv = (recv || []).filter((r) => r.due_date && r.due_date !== todayStr && !weekRecv.includes(r));
    const fmt = (list: typeof recv) => (list || []).map((r) => `• ${r.description} — R$${formatBrl(Number(r.amount))}`).join('\n') || 'Nenhum';
    const total = (recv || []).reduce((s, r) => s + Number(r.amount), 0);
    await sendReply(
      instanceId,
      token,
      phone,
      `💰 *A Receber:*\n📅 Hoje: ${todayRecv.length ? fmt(todayRecv) : 'Nenhum'}\n📅 Esta semana: ${weekRecv.length ? fmt(weekRecv) : 'Nenhum'}\n📅 Este mês: ${monthRecv.length ? fmt(monthRecv) : 'Nenhum'}\n\nTotal a receber: R$${formatBrl(total)}`
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (cmd === 'resumo' || cmd === 'relatório' || cmd === 'relatorio') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data: tx } = await supabase.from('transactions').select('type, amount, category').eq('user_id', profile.id).gte('date', start).lte('date', end);
    const income = (tx || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = (tx || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const byCat = (tx || []).filter((t) => t.type === 'expense').reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});
    const catLines = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c, v]) => `• ${c}: R$${formatBrl(v)}`)
      .join('\n');
    await sendReply(
      instanceId,
      token,
      phone,
      `📊 *Resumo do mês:*\n📈 Receitas: R$${formatBrl(income)}\n📉 Gastos: R$${formatBrl(expense)}\n💚 Saldo: R$${formatBrl(income - expense)}\n\n*Principais categorias:*\n${catLines || 'Nenhum gasto'}`
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (cmd === 'metas') {
    const { data: goals } = await supabase.from('goals').select('name, target_amount, current_amount').eq('user_id', profile.id);
    const lines = (goals || []).map((g) => {
      const pct = Number(g.target_amount) > 0 ? Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)) : 0;
      const bar = progressBar(pct);
      return `• ${g.name}: R$${formatBrl(Number(g.current_amount))} de R$${formatBrl(Number(g.target_amount))} (${bar})`;
    }).join('\n');
    await sendReply(instanceId, token, phone, `🎯 *Suas metas:*\n${lines || 'Nenhuma meta ativa'}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (cmd === 'ajuda' || cmd === 'help') {
    const help = `📱 *FinanceIA - Comandos*

*Registrar gastos:*
• gastei 45 no almoço
• gastei 120 em transporte
• gastei 50 em mercado

*Registrar receitas:*
• recebi 3000 salário
• recebi 800 freelance

*Contas e recebimentos:*
• paguei [nome da conta] — marcar como pago
• recebi [descrição] — marcar como recebido

*Consultas:*
• saldo / quanto tenho
• contas / o que vence
• a receber / o que vou receber
• resumo / relatório
• metas
• dica / conselho

• ajuda — esta mensagem`;
    await sendReply(instanceId, token, phone, help);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (cmd === 'dica' || cmd === 'conselho') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data: tx } = await supabase.from('transactions').select('type, amount, category').eq('user_id', profile.id).gte('date', start).lte('date', end);
    const { data: goals } = await supabase.from('goals').select('name, target_amount, current_amount').eq('user_id', profile.id);
    const income = (tx || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = (tx || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const balance = income - expense;
    const topCats = Object.entries(
      (tx || []).filter((t) => t.type === 'expense').reduce((acc: Record<string, number>, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
    const tip = await callGemini(
      `Você é o assistente financeiro do FinanceIA. Dê UMA dica financeira curta e personalizada (máx 3 linhas) para: saldo R$${formatBrl(balance)}, principais gastos: ${topCats.join(', ')}, metas: ${(goals || []).map((g) => g.name).join(', ') || 'nenhuma'}. Seja motivador, use emojis, responda só em português.`
    );
    await sendReply(instanceId, token, phone, tip || '💡 Mantenha o controle dos gastos e revise suas metas regularmente!');
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Gemini para mensagens livres
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const { data: tx } = await supabase.from('transactions').select('type, amount, category').eq('user_id', profile.id).gte('date', start).lte('date', end);
  const { data: goals } = await supabase.from('goals').select('name, target_amount, current_amount').eq('user_id', profile.id);
  const income = (tx || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = (tx || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;
  const score = Number(profile.score ?? profile.financial_score ?? 0);
  const level = getScoreLevel(score);
  const topCats = Object.entries(
    (tx || []).filter((t) => t.type === 'expense').reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, v]) => `${c}: R$${formatBrl(v)}`);
  const skills = (profile as { skills?: { selected?: string[] } }).skills as { selected?: string[] } | undefined;
  const skillsList = skills?.selected?.join(', ') || 'não informado';

  const geminiRes = await callGemini(
    `Você é o assistente financeiro pessoal do FinanceIA. Responda APENAS sobre finanças. Seja direto, amigável e use emojis. Máximo 5 linhas por resposta.

Contexto do usuário:
- Nome: ${profile.name || 'usuário'}
- Saldo do mês: R$${formatBrl(balance)}
- Plano: ${profile.plan_type || 'free'}
- Score: ${score} pontos (${level.label})
- Principais gastos: ${topCats.join(', ')}
- Metas ativas: ${(goals || []).map((g) => g.name).join(', ') || 'nenhuma'}
- Habilidades: ${skillsList}

Se a mensagem parecer um gasto ou receita mas estiver ambígua, extraia e responda APENAS um JSON: {"type":"income" ou "expense","amount":número,"category":"string","description":"string"}. Caso contrário, responda em texto normal.

Mensagem do usuário: "${message}"`
  );

  if (geminiRes) {
    const jsonMatch = geminiRes.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as { type?: string; amount?: number; category?: string; description?: string };
        if (parsed.type && parsed.amount && parsed.amount > 0) {
          const today = new Date().toISOString().split('T')[0];
          await supabase.from('transactions').insert({
            user_id: profile.id,
            family_id: null,
            description: parsed.description || message.slice(0, 100),
            amount: parsed.amount,
            type: parsed.type as 'income' | 'expense',
            category: parsed.category || 'Outros',
            date: today,
            recurring: false,
            frequency: null,
            notes: 'Via WhatsApp (Gemini)',
          });
          await sendReply(instanceId, token, phone, `✅ Registrado via IA!\n${parsed.type === 'income' ? '💰' : '💸'} ${parsed.category}: R$${formatBrl(parsed.amount)}`);
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch {
        /* not json, use as text */
      }
    }
    const clean = geminiRes.replace(/```\w*\n?|\n?```/g, '').trim();
    await sendReply(instanceId, token, phone, clean.slice(0, 1000));
  } else {
    await sendReply(instanceId, token, phone, '💬 Envie "ajuda" para ver os comandos disponíveis.');
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

function getCategoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    Alimentação: '🍽️', Moradia: '🏠', Transporte: '🚗', Saúde: '💊', Educação: '📚', Lazer: '🎮', Assinaturas: '📱', Roupas: '👕', Outros: '📦',
    Salário: '💼', Freelance: '💻', Investimentos: '📈', Presente: '🎁',
  };
  return map[cat] || '📦';
}
