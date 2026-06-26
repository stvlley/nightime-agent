import type { NormalizedInbound } from './telegramParser.ts';

export interface WhatsAppInbound extends NormalizedInbound {
  phoneNumberId: string;
}

type WhatsAppMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
};
type WhatsAppContact = { wa_id?: string; profile?: { name?: string } };
type WhatsAppValue = {
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  metadata?: { phone_number_id?: string };
};
type WhatsAppChange = { field?: string; value?: WhatsAppValue };
type WhatsAppEntry = { changes?: WhatsAppChange[] };
type WhatsAppPayload = { entry?: WhatsAppEntry[] };

function isWhatsAppPayload(value: unknown): value is WhatsAppPayload {
  return typeof value === 'object' && value !== null;
}

function messageText(message: WhatsAppMessage): string {
  if (message?.text?.body) return String(message.text.body);
  if (message?.button?.text) return String(message.button.text);
  if (message?.interactive?.button_reply?.title) return String(message.interactive.button_reply.title);
  if (message?.interactive?.list_reply?.title) return String(message.interactive.list_reply.title);
  return '';
}

function messageType(message: WhatsAppMessage): NormalizedInbound['messageType'] {
  if (message?.type === 'image') return 'image';
  if (message?.type === 'audio' || message?.type === 'voice') return 'audio';
  if (message?.type === 'document') return 'file';
  if (message?.type === 'location') return 'location';
  if (message?.type === 'text' || message?.type === 'button' || message?.type === 'interactive') return 'text';
  return 'other';
}

function contactName(value: WhatsAppValue, from: string): string {
  const contact = (value.contacts ?? []).find((c) => c.wa_id === from) ?? value.contacts?.[0];
  return String(contact?.profile?.name || contact?.wa_id || from || 'WhatsApp user');
}

/**
 * Normalize Meta WhatsApp Cloud API webhook payloads into channel-agnostic
 * inbound messages. Returns an empty list for status-only or unsupported events.
 */
export function parseWhatsAppWebhook(payload: unknown): WhatsAppInbound[] {
  const out: WhatsAppInbound[] = [];
  if (!isWhatsAppPayload(payload)) return out;
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      if (change?.field !== 'messages') continue;
      const value = change?.value;
      if (!value) continue;
      const phoneNumberId = String(value?.metadata?.phone_number_id || '');
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      if (!phoneNumberId || messages.length === 0) continue;

      for (const message of messages) {
        const from = String(message?.from || '');
        if (!from) continue;
        out.push({
          phoneNumberId,
          externalThreadId: from,
          clientHandle: from,
          clientName: contactName(value, from),
          username: null,
          text: messageText(message),
          messageType: messageType(message),
          externalMessageId: String(message?.id || `${from}-${message?.timestamp || Date.now()}`),
          timestamp: message?.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
        });
      }
    }
  }

  return out;
}
