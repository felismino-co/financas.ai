import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLUGGY_BASE = 'https://api.pluggy.ai';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function threeMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

async function getPluggyApiKey(): Promise<string> {
  const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
  const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Pluggy not configured');
  const res = await fetch(`${PLUGGY_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret, nonExpiring: false }),
  });
  if (!res.ok) throw new Error('Pluggy auth failed');
  const { apiKey } = await res.json();
  return apiKey;
}

function mapPluggyCategory(cat: string | null): string {
  if (!cat) return 'Outros';
  const lower = cat.toLowerCase();
  const mapping: Record<string, string> = {
    alimentação: 'Alimentação',
    alimentacao: 'Alimentação',
    food: 'Alimentação',
    moradia: 'Moradia',
    housing: 'Moradia',
    transporte: 'Transporte',
    transport: 'Transporte',
    saúde: 'Saúde',
    saude: 'Saúde',
    health: 'Saúde',
    educação: 'Educação',
    educacao: 'Educação',
    education: 'Educação',
    lazer: 'Lazer',
    entertainment: 'Lazer',
    assinaturas: 'Assinaturas',
    subscriptions: 'Assinaturas',
    roupas: 'Roupas',
    clothing: 'Roupas',
    salário: 'Salário',
    salario: 'Salário',
    salary: 'Salário',
    freelance: 'Freelance',
    investimentos: 'Investimentos',
    investments: 'Investimentos',
    presente: 'Presente',
    gift: 'Presente',
  };
  for (const [key, val] of Object.entries(mapping)) {
    if (lower.includes(key)) return val;
  }
  return 'Outros';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = req.headers.get('Authorization');
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = auth.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: auth } } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { itemId?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { itemId, userId } = body;
  const targetUserId = userId || user.id;
  if (!itemId || !targetUserId) {
    return new Response(JSON.stringify({ error: 'Missing itemId or userId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (targetUserId !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiKey = await getPluggyApiKey();
    const headers = { 'Content-Type': 'application/json', 'X-API-KEY': apiKey };

    const accountsRes = await fetch(`${PLUGGY_BASE}/accounts?itemId=${itemId}`, { headers });
    if (!accountsRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch accounts' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const accountsData = await accountsRes.json();
    const accounts = accountsData.results || [];

    const from = threeMonthsAgo();
    const to = today();
    let totalImported = 0;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    for (const acc of accounts) {
      const txRes = await fetch(
        `${PLUGGY_BASE}/transactions?accountId=${acc.id}&from=${from}&to=${to}&pageSize=500`,
        { headers }
      );
      if (!txRes.ok) continue;
      const txData = await txRes.json();
      const txs = txData.results || [];

      for (const tx of txs) {
        const pluggyId = tx.id;
        const { data: existing } = await supabaseAdmin
          .from('transactions')
          .select('id')
          .eq('pluggy_transaction_id', pluggyId)
          .single();
        if (existing) continue;

        const type = tx.type === 'DEBIT' ? 'expense' : 'income';
        const amount = Math.abs(Number(tx.amount));
        const date = typeof tx.date === 'string' ? tx.date.split('T')[0] : new Date(tx.date).toISOString().split('T')[0];
        const category = mapPluggyCategory(tx.category || null);

        const { error: insertErr } = await supabaseAdmin.from('transactions').insert({
          user_id: targetUserId,
          family_id: null,
          description: tx.description || 'Transação importada',
          amount,
          type,
          category,
          date,
          recurring: false,
          frequency: null,
          notes: null,
          source: 'pluggy',
          pluggy_transaction_id: pluggyId,
        });
        if (!insertErr) totalImported++;
      }
    }

    await supabaseAdmin
      .from('bank_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('pluggy_item_id', itemId)
      .eq('user_id', targetUserId);

    return new Response(
      JSON.stringify({ success: true, transactionsImported: totalImported }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
