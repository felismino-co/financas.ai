import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kiwify-signature' };

interface KiwifyPayload {
  event?: string;
  data?: {
    customer?: { email?: string };
    product?: { id?: string };
    subscription?: { id?: string; status?: string };
  };
}

async function verifySignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
    const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return signature === hex || signature === `sha256=${hex}` || signature.replace('sha256=', '') === hex;
  } catch {
    return false;
  }
}

function getDaysForProduct(productId: string): number {
  const id = (productId || '').toLowerCase();
  if (id.includes('mensal') || id.includes('47') || id.includes('vujcm')) return 31;
  if (id.includes('semestral') || id.includes('197') || id.includes('uzumx')) return 183;
  if (id.includes('anual') || id.includes('297') || id.includes('y8znc')) return 366;
  return 31;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const secret = Deno.env.get('KIWIFY_WEBHOOK_SECRET');
  if (!secret) {
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const signature = req.headers.get('x-kiwify-signature');
  const rawBody = await req.text();

  if (!(await verifySignature(rawBody, signature, secret))) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let body: KiwifyPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const event = body.event || (body as { type?: string }).type || '';
  const email = body.data?.customer?.email;
  const productId = body.data?.product?.id || '';

  const activateEvents = [
    'order.approved',
    'subscription.activated',
    'subscription.renewed',
    'compra_aprovada',
    'subscription_renewed',
  ];
  const cancelEvents = [
    'order.refunded',
    'subscription.canceled',
    'compra_reembolsada',
    'subscription_canceled',
  ];

  if (!email) {
    return new Response(JSON.stringify({ ok: true, message: 'No email, skipped' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    return new Response(JSON.stringify({ ok: true, message: 'User not found' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (activateEvents.some((e) => event.toLowerCase().includes(e))) {
    const days = getDaysForProduct(productId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    await supabase
      .from('profiles')
      .update({
        plan_type: 'pro',
        plan_expires_at: expiresAt.toISOString(),
        ai_credits_limit: 999999,
      })
      .eq('id', user.id);
    return new Response(JSON.stringify({ ok: true, plan: 'pro' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (cancelEvents.some((e) => event.toLowerCase().includes(e))) {
    await supabase
      .from('profiles')
      .update({
        plan_type: 'free',
        plan_expires_at: null,
        ai_credits_limit: 30,
      })
      .eq('id', user.id);
    return new Response(JSON.stringify({ ok: true, plan: 'free' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true, message: 'Event ignored' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
