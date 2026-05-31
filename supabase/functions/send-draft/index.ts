// Approve + send a pending agent draft (Phase 2).
//
// Called by the provider app from the Inbox approval queue. JWT-verified: the
// caller's session token authorizes them, and we additionally confirm they own
// the draft before sending. Configure with `verify_jwt = true`.
//
// Channel-aware: a Telegram draft is delivered via the Bot API; a web-chat draft
// has no external destination, so approval simply marks it sent — it becomes
// visible to the visitor on their next webchat-poll.

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { sendTelegramMessage } from '../_shared/telegram.ts';
import { json, corsHeaders } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const SENDABLE = ['pending', 'approved', 'failed'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  // Identify the caller from their session token.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  let messageId: string | undefined;
  try {
    ({ messageId } = await req.json());
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!messageId) return json({ error: 'missing_message_id' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: draft } = await admin
    .from('messages')
    .select('id, user_id, thread_id, text, approval_status, threads(channel, external_thread_id)')
    .eq('id', messageId)
    .maybeSingle();

  if (!draft || draft.user_id !== user.id) return json({ error: 'not_found' }, 404);
  if (!SENDABLE.includes(draft.approval_status as string)) return json({ error: 'invalid_state' }, 409);

  const channelName = (draft as any).threads?.channel as string | undefined;
  const chatId = (draft as any).threads?.external_thread_id as string | undefined;

  if (channelName === 'telegram') {
    if (!chatId) return json({ error: 'no_destination' }, 400);
    const { data: channel } = await admin
      .from('agent_channels')
      .select('bot_token, active')
      .eq('user_id', user.id)
      .eq('channel', 'telegram')
      .maybeSingle();
    if (!channel?.bot_token || !channel.active) return json({ error: 'channel_unavailable' }, 400);

    const sent = await sendTelegramMessage(channel.bot_token as string, chatId, draft.text as string);
    if (!sent.ok) {
      await admin.from('messages').update({ approval_status: 'failed' }).eq('id', messageId);
      return json({ error: 'send_failed', detail: sent.error }, 502);
    }
  } else if (channelName !== 'webchat') {
    // Web chat needs no external send — marking it sent (below) makes it visible
    // to the visitor's next poll. Any other channel is not wired yet.
    return json({ error: 'unsupported_channel' }, 400);
  }

  await admin
    .from('messages')
    .update({ approval_status: 'sent', delivered_at: new Date().toISOString() })
    .eq('id', messageId);
  await admin.from('agent_events').insert({
    user_id: user.id,
    thread_id: draft.thread_id,
    message_id: messageId,
    kind: 'sent',
    source: 'approval',
  });

  return json({ ok: true });
});
