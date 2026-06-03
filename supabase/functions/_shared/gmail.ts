export interface SendResult {
  ok: boolean;
  error?: string;
}

interface TokenResult {
  accessToken: string | null;
  error?: string;
}

const CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? '';

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function escapeHeader(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim();
}

export async function getGoogleAccessToken(refreshToken: string): Promise<TokenResult> {
  if (refreshToken.startsWith('ya29.')) return { accessToken: refreshToken };
  if (!CLIENT_ID || !CLIENT_SECRET) return { accessToken: null, error: 'missing_google_oauth_env' };

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) return { accessToken: null, error: `oauth ${res.status}: ${JSON.stringify(body)}` };
    return { accessToken: body.access_token as string };
  } catch (e) {
    return { accessToken: null, error: String(e) };
  }
}

export async function gmailApi<T>(refreshToken: string, path: string, init: RequestInit = {}): Promise<{ ok: boolean; data?: T; error?: string }> {
  const token = await getGoogleAccessToken(refreshToken);
  if (!token.accessToken) return { ok: false, error: token.error };

  try {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) return { ok: false, error: `gmail ${res.status}: ${text}` };
    return { ok: true, data: data as T };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function sendGoogleVoiceReply(
  refreshToken: string,
  replyToEmail: string,
  text: string,
  threadId?: string | null,
): Promise<SendResult> {
  const raw = base64UrlEncode(
    [
      `To: ${escapeHeader(replyToEmail)}`,
      'Subject: Re: Google Voice message',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      text,
    ].join('\r\n'),
  );
  const sent = await gmailApi(refreshToken, 'messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
  });
  return sent.ok ? { ok: true } : { ok: false, error: sent.error };
}
