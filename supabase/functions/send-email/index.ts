import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API = 'https://api.resend.com/emails';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

interface ReqBody {
  to: string;
  type: string;
  subject: string;
  html: string;
  meta?: Record<string, unknown>;
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

  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { to, type, subject, html, meta = {} } = body;
  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: 'Missing to, subject or html' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

  const data = await res.json().catch(() => ({}));

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  await supabaseAdmin.from('email_logs').insert({
    user_id: user.id,
    type: type || 'unknown',
    subject,
    meta: { ...meta, resend_id: data.id, status: res.status },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: data.message || 'Resend error' }), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
