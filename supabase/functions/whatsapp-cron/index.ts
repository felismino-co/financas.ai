/**
 * FinanceIA — Cron job para notificações WhatsApp
 * Chamado pelo pg_cron às 8h e 21h.
 * Delega para whatsapp-notifications via HTTP.
 * ?mode=8h → contas, recebimentos, resumo semanal
 * ?mode=21h → lembrete diário noturno
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') || '8h';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

  try {
    const notifUrl = `${supabaseUrl}/functions/v1/whatsapp-notifications?mode=${mode}`;
    const res = await fetch(notifUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}` },
    });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
