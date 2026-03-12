/**
 * Cliente Z-API para envio de mensagens WhatsApp.
 * No frontend: configuração. No backend (Edge Function): envio real.
 */
const ZAPI_BASE = 'https://api.z-api.io';

export interface ZApiSendParams {
  phone: string;
  message: string;
}

/**
 * Envia mensagem via Z-API. Usar no backend (Edge Function) com instanceId e token do env.
 */
export async function sendWhatsAppMessage(
  instanceId: string,
  token: string,
  params: ZApiSendParams
): Promise<{ ok: boolean; error?: string }> {
  try {
    const phone = params.phone.replace(/\D/g, '');
    if (phone.length < 10) return { ok: false, error: 'Número inválido' };
    const formatted = phone.startsWith('55') ? phone : `55${phone}`;

    const res = await fetch(`${ZAPI_BASE}/instances/${instanceId}/token/${token}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: formatted,
        message: params.message,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || data.message || 'Erro ao enviar' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro de conexão' };
  }
}
