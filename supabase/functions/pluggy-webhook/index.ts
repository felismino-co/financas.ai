import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PluggyWebhookEvent = 'item/created' | 'item/updated' | 'item/error';

interface PluggyWebhookPayload {
  event: PluggyWebhookEvent;
  eventId: string;
  itemId: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: PluggyWebhookPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { event, itemId } = body;
  if (!event || !itemId) {
    return new Response(JSON.stringify({ error: 'Missing event or itemId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const now = new Date().toISOString();

  try {
    const { data: conn } = await supabase
      .from('bank_connections')
      .select('id, user_id')
      .eq('pluggy_item_id', itemId)
      .single();

    if (conn) {
      switch (event) {
        case 'item/created':
          await supabase
            .from('bank_connections')
            .update({
              status: 'active',
              last_synced_at: now,
            })
            .eq('id', conn.id);
          break;

        case 'item/updated':
          await supabase
            .from('bank_connections')
            .update({ last_synced_at: now })
            .eq('id', conn.id);
          await supabase.from('insights').insert({
            user_id: conn.user_id,
            type: 'opportunity',
            title: 'Banco sincronizado',
            description: 'Suas transações foram atualizadas automaticamente.',
            impact: null,
            read: false,
          });
          break;

        case 'item/error':
          await supabase
            .from('bank_connections')
            .update({ status: 'error' })
            .eq('id', conn.id);
          break;
      }
    }
  } catch (_e) {
    // Não falhar o webhook — Pluggy exige 200 em < 5s
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
