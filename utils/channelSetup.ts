// Pure helpers behind self-serve channel connection (Settings → Channels).
// No Supabase or React imports so everything here is unit-testable in Vitest.
// The service layer that talks to the network lives in lib/channels.ts.

/** Public-slug format enforced by the profiles_slug_format DB constraint. */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/**
 * Derive a DB-valid slug from a business name, display name, or email.
 * Mirrors scripts/enable-webchat.mjs so script- and app-connected providers
 * end up with the same shape of slug.
 */
export function slugifyHandle(input: string): string {
  return (
    input
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'provider'
  );
}

/**
 * Cheap structural check for a Telegram bot token (digits, colon, secret) so
 * we can reject obvious paste mistakes before hitting the Telegram API.
 */
export function looksLikeTelegramToken(token: string): boolean {
  return /^\d{5,}:[A-Za-z0-9_-]{30,}$/.test(token.trim());
}

/**
 * Hex secret for agent_channels.webhook_secret. Prefers the platform CSPRNG;
 * falls back to Math.random only where crypto.getRandomValues is unavailable
 * (older Hermes runtimes) — acceptable because the secret only authenticates
 * webhook POSTs that are additionally scoped per provider row.
 */
export function randomHexSecret(bytes = 24): string {
  const out = new Uint8Array(bytes);
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(out);
  } else {
    for (let i = 0; i < bytes; i++) out[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(out, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** `https://<ref>.supabase.co` → the Edge Functions base used by the widget. */
export function functionsBaseFromSupabaseUrl(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
}

export interface WebchatLinkOptions {
  /** Where public/chat.html is hosted, e.g. https://nightime-agent.vercel.app/chat.html */
  widgetBase: string;
  slug: string;
  functionsBase: string;
  anonKey: string;
  /** Header label shown to the visitor. */
  brand?: string;
}

/** Shareable visitor link for the embeddable web-chat widget. */
export function buildWebchatLink(opts: WebchatLinkOptions): string {
  const params = new URLSearchParams({ slug: opts.slug, base: opts.functionsBase });
  if (opts.anonKey) params.set('key', opts.anonKey);
  if (opts.brand) params.set('brand', opts.brand);
  return `${opts.widgetBase}?${params.toString()}`;
}

/** Copy-paste iframe snippet for embedding the widget on a provider's site. */
export function buildWebchatEmbed(link: string): string {
  return `<iframe src="${link}" style="width:380px;height:560px;border:0" title="Chat"></iframe>`;
}

export type KnownChannel = 'webchat' | 'telegram' | 'whatsapp' | 'gv';

export const CHANNEL_LABELS: Record<string, string> = {
  webchat: 'Web chat',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  gv: 'Google Voice',
  email: 'Email',
  sms: 'SMS',
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}
