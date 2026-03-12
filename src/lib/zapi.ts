/**
 * Cliente Z-API para envio de mensagens WhatsApp.
 * Usado apenas no backend (Edge Function). No frontend, use o webhook para receber.
 */
const ZAPI_BASE = 'https://api.z-api.io';

export interface ZApiSendParams {
  phone: string;
  message: string;
}

export async function sendWhatsAppMessage(
  instanceId: string,
  token: string,
  params: ZApiSendParams
): Promise<{ ok: boolean; error?: string }> {
  try {
    const phone = params.phone.replace(/\D/g, '');
    if (phone.length < 10) return { ok: false, error: 'Número inválido' };

    const res = await fetch(`${ZAPI_BASE}/instances/${instanceId}/token/${token}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: `55${phone}`,
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
