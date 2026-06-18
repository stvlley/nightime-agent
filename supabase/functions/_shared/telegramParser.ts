// Telegram update parsing — pure, dependency-free (shared by the Edge Function
// and vitest).

export interface NormalizedInbound {
  /** Telegram chat id — stable per conversation, used as external_thread_id. */
  externalThreadId: string;
  /** Display handle for the client (@username when available, else numeric id). */
  clientHandle: string;
  clientName: string;
  username: string | null;
  text: string;
  messageType: 'text' | 'image' | 'audio' | 'file' | 'location' | 'other';
  externalMessageId: string;
  timestamp: string; // ISO 8601
}

function telegramMessageType(message: any): NormalizedInbound['messageType'] {
  if (message.photo) return 'image';
  if (message.voice || message.audio) return 'audio';
  if (message.document) return 'file';
  if (message.location) return 'location';
  if (message.text) return 'text';
  return 'other';
}

/**
 * Normalize a Telegram webhook update into a channel-agnostic inbound message.
 * Returns null for updates we don't handle (no message, missing chat/sender).
 */
export function parseTelegramUpdate(update: any): NormalizedInbound | null {
  const message = update?.message ?? update?.edited_message;
  if (!message || !message.chat || !message.from) return null;

  const username: string | null = message.from.username ?? null;
  const name = [message.from.first_name, message.from.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    externalThreadId: String(message.chat.id),
    clientHandle: username ? `@${username}` : String(message.from.id),
    clientName: name || 'Telegram user',
    username,
    text: message.text ?? message.caption ?? '',
    messageType: telegramMessageType(message),
    externalMessageId: String(message.message_id),
    timestamp: message.date
      ? new Date(message.date * 1000).toISOString()
      : new Date().toISOString(),
  };
}
