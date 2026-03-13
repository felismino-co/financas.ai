/**
 * Cliente Z-API para envio de mensagens WhatsApp.
 * Formata número, retry automático, rate limiting.
 */
const ZAPI_BASE = 'https://api.z-api.io';

export interface ZApiSendParams {
  phone: string;
  message: string;
}

/** Formata número: remove +, espaços, traços; adiciona 55 se não tiver. Formato final: 5511999999999 */
export function formatPhoneForZApi(phone: string): string {
  const digits = phone.replace(/[\s\-+()]/g, '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

const lastSendByUser = new Map<string, number>();
const RATE_LIMIT_MS = 1000;

/** Envia mensagem via Z-API com retry (3 tentativas) e rate limiting. */
export async function sendWhatsAppMessage(
  instanceId: string,
  token: string,
  params: ZApiSendParams
): Promise<{ ok: boolean; error?: string }> {
  const formatted = formatPhoneForZApi(params.phone);
  if (!formatted || formatted.length < 12) return { ok: false, error: 'Número inválido' };

  const now = Date.now();
  const last = lastSendByUser.get(formatted) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - (now - last)));
  }
  lastSendByUser.set(formatted, Date.now());

  const maxRetries = 3;
  let lastError = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${ZAPI_BASE}/instances/${instanceId}/token/${token}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatted, message: params.message }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true };
      lastError = (data.error || data.message || `HTTP ${res.status}`) as string;
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1000 * attempt));
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Erro de conexão';
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  return { ok: false, error: lastError };
}
