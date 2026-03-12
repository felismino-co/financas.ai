import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

function extractMessage(body: Record<string, unknown>): string | null {
  const text = (body.text as { message?: string })?.message ?? (body.body as string) ?? '';
  return typeof text === 'string' ? text.trim() : null;
}

function extractPhone(body: Record<string, unknown>): string | null {
  const raw = (body.phone as string) ?? '';
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const instanceId = Deno.env.get('VITE_ZAPI_INSTANCE_ID');
  const token = Deno.env.get('VITE_ZAPI_TOKEN');
  if (!instanceId || !token) {
    return new Response(JSON.stringify({ error: 'Z-API not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (body.fromMe === true) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const message = extractMessage(body);
  const phone = extractPhone(body);
  if (!message || !phone) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const normalized = phone.replace(/^55/, '');
  const { data: profiles } = await supabase.from('profiles').select('id').or(`phone_number.eq.${phone},phone_number.eq.${normalized},phone_number.eq.55${normalized}`).limit(1);
  const profile = profiles?.[0];

  if (profile) {
    const cmd = message.toLowerCase().trim();
    if (cmd === 'conectar' || cmd === 'link' || cmd === 'vincular') {
      await supabase.from('profiles').update({ whatsapp_connected: true }).eq('id', profile.id);
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
