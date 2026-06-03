import type { NormalizedInbound } from './telegramParser.ts';

export interface GmailPubSubNotification {
  emailAddress: string;
  historyId: string;
}

export interface GmailMessage {
  id?: string;
  threadId?: string;
  internalDate?: string;
  snippet?: string;
  payload?: {
    mimeType?: string;
    headers?: Array<{ name?: string; value?: string }>;
    body?: { data?: string };
    parts?: GmailMessage['payload'][];
  };
}

export interface GoogleVoiceInbound extends NormalizedInbound {
  replyToEmail: string;
  gmailThreadId: string;
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function header(message: GmailMessage, name: string): string {
  const lower = name.toLowerCase();
  return message.payload?.headers?.find((h) => h.name?.toLowerCase() === lower)?.value ?? '';
}

function walkTextParts(payload: GmailMessage['payload']): string[] {
  if (!payload) return [];
  const own =
    payload.mimeType === 'text/plain' && payload.body?.data
      ? [base64UrlDecode(payload.body.data)]
      : [];
  return own.concat((payload.parts ?? []).flatMap((part) => walkTextParts(part)));
}

function cleanBody(text: string): string {
  return text
    .replace(/\r/g, '')
    .split(/\nOn .*wrote:\n/i)[0]
    .split(/\n-{2,} Forwarded message -{2,}/i)[0]
    .trim();
}

function extractEmail(value: string): string {
  const angle = value.match(/<([^>]+)>/);
  return (angle?.[1] ?? value).trim();
}

function extractPhone(...values: string[]): string {
  const joined = values.join(' ');
  const phone = joined.match(/\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  return phone ? phone[0].replace(/[^\d+]/g, '') : extractEmail(values.find(Boolean) ?? 'Google Voice client');
}

export function parseGmailPubSub(body: unknown): GmailPubSubNotification | null {
  const data = (body as any)?.message?.data;
  if (typeof data !== 'string' || !data) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(data));
    if (typeof decoded.emailAddress !== 'string' || typeof decoded.historyId !== 'string') return null;
    return {
      emailAddress: decoded.emailAddress.toLowerCase(),
      historyId: decoded.historyId,
    };
  } catch {
    return null;
  }
}

export function parseGoogleVoiceMessage(message: GmailMessage): GoogleVoiceInbound | null {
  const from = header(message, 'From');
  const replyTo = header(message, 'Reply-To');
  const subject = header(message, 'Subject');
  const date = header(message, 'Date');
  const fromEmail = extractEmail(from);
  const replyToEmail = extractEmail(replyTo || (fromEmail.includes('@txt.voice.google.com') ? fromEmail : ''));
  const sender = `${from} ${replyToEmail}`.toLowerCase();
  const isGoogleVoice =
    sender.includes('voice-noreply@google.com') ||
    sender.includes('@txt.voice.google.com') ||
    /^sms from/i.test(subject) ||
    /^voicemail from/i.test(subject);

  if (!isGoogleVoice || !message.id || !replyToEmail.includes('@txt.voice.google.com')) return null;

  const text = cleanBody(walkTextParts(message.payload).join('\n').trim() || message.snippet || '');
  if (!text) return null;

  const clientHandle = extractPhone(subject, from, replyTo);
  return {
    externalThreadId: replyToEmail,
    externalMessageId: message.id,
    clientHandle,
    clientName: clientHandle,
    username: null,
    text,
    messageType: /^voicemail from/i.test(subject) ? 'audio' : 'text',
    timestamp: date ? new Date(date).toISOString() : new Date(Number(message.internalDate ?? Date.now())).toISOString(),
    replyToEmail,
    gmailThreadId: message.threadId ?? '',
  };
}
