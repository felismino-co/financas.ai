import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APP_URL = 'https://financas-ai-ivory.vercel.app';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

function extractMessage(body: Record<string, unknown>): string | null {
  const text = (body.text as { message?: string })?.message ?? (body.body as string) ?? (body.message as { text?: string })?.text ?? '';
  return typeof text === 'string' ? text.trim() : null;
}

function extractPhone(body: Record<string, unknown>): string | null {
  const raw = (body.phone as string) ?? (body.from as string) ?? (body.sender as string) ?? '';
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
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

interface ParsedTx {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
}

async function parseMessage(text: string): Promise<ParsedTx | null> {
  const lower = text.toLowerCase().trim();

  if (lower === 'ajuda' || lower === 'help') return null;
  if (lower === 'saldo' || lower === 'resumo') return null;

  const patterns: { regex: RegExp; type: 'income' | 'expense'; category: string }[] = [
    { regex: /gastei\s+(\d+(?:[.,]\d+)?)\s+(?:no\s+)?mercado/i, type: 'expense', category: 'Alimentação' },
    { regex: /despesa\s+(\d+(?:[.,]\d+)?)\s+combust[ií]vel/i, type: 'expense', category: 'Transporte' },
    { regex: /recebi\s+(\d+(?:[.,]\d+)?)\s+sal[aá]rio/i, type: 'income', category: 'Salário' },
    { regex: /paguei\s+(\d+(?:[.,]\d+)?)\s+(?:a\s+)?luz/i, type: 'expense', category: 'Moradia' },
    { regex: /almo[cç]o\s+(\d+(?:[.,]\d+)?)/i, type: 'expense', category: 'Alimentação' },
    { regex: /gastei\s+(\d+(?:[.,]\d+)?)/i, type: 'expense', category: 'Outros' },
    { regex: /recebi\s+(\d+(?:[.,]\d+)?)/i, type: 'income', category: 'Outros' },
    { regex: /despesa\s+(\d+(?:[.,]\d+)?)/i, type: 'expense', category: 'Outros' },
    { regex: /(\d+(?:[.,]\d+)?)\s+(?:no\s+)?mercado/i, type: 'expense', category: 'Alimentação' },
    { regex: /(\d+(?:[.,]\d+)?)\s+combust[ií]vel/i, type: 'expense', category: 'Transporte' },
  ];

  for (const p of patterns) {
    const m = lower.match(p.regex);
    if (m) {
      const amount = parseFloat(m[1].replace(',', '.'));
      if (amount > 0) {
        return { type: p.type, amount, category: p.category, description: text.slice(0, 100) };
      }
    }
  }

  const geminiRes = await callGemini(
    `Extraia de uma mensagem em português os dados de uma transação financeira. Responda APENAS um JSON: {"type":"income" ou "expense","amount":número,"category":"string","description":"string"}. Se não for transação, responda "null". Mensagem: "${text}"`
  );
  if (geminiRes && !geminiRes.toLowerCase().includes('null')) {
    try {
      const json = geminiRes.replace(/```\w*\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(json) as ParsedTx;
      if (parsed.type && parsed.amount > 0) {
        return {
          type: parsed.type as 'income' | 'expense',
          amount: Number(parsed.amount),
          category: parsed.category || 'Outros',
          description: parsed.description || text.slice(0, 100),
        };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
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
    .select('id')
    .or(`phone_number.eq.${phone},phone_number.eq.${normalized},phone_number.eq.55${normalized}`)
    .limit(1);
  const profile = profiles?.[0];

  if (!profile) {
    const reply = `❌ Número não vinculado. Acesse ${APP_URL} para conectar seu WhatsApp.`;
    await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.startsWith('55') ? phone : `55${phone}`, message: reply }),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const cmd = message.toLowerCase().trim();
  if (cmd === 'conectar' || cmd === 'link' || cmd === 'vincular') {
    await supabase.from('profiles').update({ whatsapp_connected: true }).eq('id', profile.id);
    await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.startsWith('55') ? phone : `55${phone}`, message: '✅ Conectado! Envie "ajuda" para ver os comandos.' }),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (cmd === 'ajuda' || cmd === 'help') {
    const help = `📱 *FinanceIA - Comandos*

*Registrar gastos:*
• gastei 50 no mercado
• despesa 120 combustível
• almoço 35
• paguei 80 luz

*Registrar receitas:*
• recebi 3000 salário

*Outros:*
• saldo — ver saldo do mês
• resumo — resumo financeiro
• ajuda — esta mensagem`;
    await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.startsWith('55') ? phone : `55${phone}`, message: help }),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (cmd === 'saldo' || cmd === 'resumo') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data: tx } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', profile.id)
      .gte('date', start)
      .lte('date', end);
    const income = (tx || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = (tx || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const balance = income - expense;
    const reply = `📊 *Resumo do mês*
Receitas: R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Despesas: R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Saldo: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.startsWith('55') ? phone : `55${phone}`, message: reply }),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const parsed = await parseMessage(message);
  if (parsed) {
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('transactions').insert({
      user_id: profile.id,
      family_id: null,
      description: parsed.description,
      amount: parsed.amount,
      type: parsed.type,
      category: parsed.category,
      date: today,
      recurring: false,
      frequency: null,
      notes: 'Via WhatsApp',
    });

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data: tx } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', profile.id)
      .gte('date', start)
      .lte('date', end);
    const income = (tx || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = (tx || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const balance = income - expense;

    const reply = `✅ Registrado! ${parsed.type === 'income' ? 'Receita' : 'Despesa'} de R$ ${parsed.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${parsed.category}.
Saldo do mês: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.startsWith('55') ? phone : `55${phone}`, message: reply }),
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
