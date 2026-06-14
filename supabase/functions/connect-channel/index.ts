// Self-serve channel connection from the provider app (Phase 2 → in-app).
//
// JWT-verified: the caller's session authorizes them and we store creds against
// THEIR user id (server-side, so secrets never round-trip through client reads).
// Mirrors the connect-*.mjs scripts so providers can connect without a terminal.
//
// Actions:
//   telegram  { botToken }                  → validate via getMe, set webhook, store
//   whatsapp  { phoneNumberId, accessToken } → validate via Graph, store
//   google    { refreshToken, gmailAddress } → start Gmail watch, store (gv channel)
//
// Web chat needs no creds and is enabled directly by the app via RLS, so it is
// intentionally not handled here.

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { getGoogleAccessToken } from '../_shared/gmail.ts';
import { json, corsHeaders } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/** Public base the external services call back to (Telegram webhook, etc.). */
function functionsBase(): string {
  const override = Deno.env.get('FUNCTIONS_BASE_URL');
  if (override) return override.replace(/\/$/, '');
  if (SUPABASE_URL.includes('.supabase.co')) {
    return SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co');
  }
  return `${SUPABASE_URL}/functions/v1`;
}

async function upsertChannel(admin: any, row: Record<string, unknown>) {
  // on_conflict (user_id, channel): one row per provider per channel.
  const { error } = await admin
    .from('agent_channels')
    .upsert(row, { onConflict: 'user_id,channel' });
  if (error) throw new Error(error.message);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const action = String(body?.action ?? '');
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    if (action === 'telegram') {
      const botToken = String(body.botToken ?? '').trim();
      if (!botToken) return json({ error: 'missing_bot_token' }, 400);

      const me = await fetch(`https://api.telegram.org/bot${botToken}/getMe`).then((r) => r.json());
      if (!me?.ok) return json({ error: 'invalid_bot_token' }, 400);
      const username = me.result?.username ?? null;

      const webhookSecret = crypto.randomUUID().replace(/-/g, '');
      const set = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: `${functionsBase()}/telegram-webhook`,
          secret_token: webhookSecret,
          allowed_updates: ['message'],
        }),
      }).then((r) => r.json());
      if (!set?.ok) return json({ error: 'set_webhook_failed', detail: set?.description }, 502);

      await upsertChannel(admin, {
        user_id: user.id,
        channel: 'telegram',
        external_account_id: username,
        bot_token: botToken,
        webhook_secret: webhookSecret,
        active: true,
      });
      return json({ ok: true, account: username });
    }

    if (action === 'whatsapp') {
      const phoneNumberId = String(body.phoneNumberId ?? '').trim();
      const accessToken = String(body.accessToken ?? '').trim();
      if (!phoneNumberId || !accessToken) return json({ error: 'missing_fields' }, 400);

      const verify = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=id,display_phone_number,verified_name&access_token=${encodeURIComponent(accessToken)}`,
      ).then((r) => r.json());
      if (!verify?.id) return json({ error: 'invalid_whatsapp_credentials', detail: verify?.error?.message }, 400);

      await upsertChannel(admin, {
        user_id: user.id,
        channel: 'whatsapp',
        external_account_id: phoneNumberId,
        bot_token: accessToken,
        webhook_secret: crypto.randomUUID().replace(/-/g, ''),
        active: true,
        metadata: {
          displayPhoneNumber: verify.display_phone_number ?? null,
          verifiedName: verify.verified_name ?? null,
        },
      });
      return json({ ok: true, account: verify.display_phone_number ?? phoneNumberId });
    }

    if (action === 'google') {
      const refreshToken = String(body.refreshToken ?? '').trim();
      const gmailAddress = String(body.gmailAddress ?? '').trim().toLowerCase();
      if (!refreshToken || !gmailAddress) return json({ error: 'missing_fields' }, 400);

      const topic = Deno.env.get('GOOGLE_PUBSUB_TOPIC');
      if (!topic) return json({ error: 'pubsub_not_configured' }, 400);

      const token = await getGoogleAccessToken(refreshToken);
      if (!token.accessToken) {
        return json({ error: 'google_auth_failed', detail: token.error }, 400);
      }

      const watch = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
        method: 'POST',
        headers: { authorization: `Bearer ${token.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ topicName: topic, labelIds: ['INBOX'] }),
      }).then((r) => r.json());
      if (!watch?.historyId) return json({ error: 'gmail_watch_failed', detail: watch }, 502);

      await upsertChannel(admin, {
        user_id: user.id,
        channel: 'gv',
        external_account_id: gmailAddress,
        bot_token: refreshToken,
        webhook_secret: crypto.randomUUID().replace(/-/g, ''),
        active: true,
        metadata: {
          lastHistoryId: String(watch.historyId),
          watchExpiration: watch.expiration ? String(watch.expiration) : null,
          topic,
        },
      });
      return json({ ok: true, account: gmailAddress });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    return json({ error: 'handler_error', detail: String(e) }, 500);
  }
});
