/**
 * Processador de mensagens recebidas via webhook Z-API.
 * Usado na Edge Function whatsapp-webhook.
 */

export interface ZApiWebhookPayload {
  phone?: string;
  fromMe?: boolean;
  momment?: number;
  status?: string;
  chatName?: string;
  senderPhoto?: string;
  senderName?: string;
  photo?: string;
  broadcast?: boolean;
  type?: string;
  text?: { message?: string };
  body?: string;
}

export function extractMessageFromPayload(payload: ZApiWebhookPayload): string | null {
  const text = payload.text?.message ?? payload.body ?? '';
  return typeof text === 'string' ? text.trim() : null;
}

export function extractPhoneFromPayload(payload: ZApiWebhookPayload): string | null {
  const raw = payload.phone ?? payload.senderPhoto ?? '';
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

export function isFromMe(payload: ZApiWebhookPayload): boolean {
  return payload.fromMe === true;
}
