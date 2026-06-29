// Web-chat inbound → agent runtime (Phase 2, zero-setup channel).
//
// The embeddable widget POSTs visitor messages here. Unlike Telegram, this
// channel needs no provider credentials: the provider is identified by their
// PUBLIC `profiles.slug`, and a per-conversation `sessionId` (an unguessable
// UUID the widget generates) acts as the visitor's capability to read back that
// one thread. Delivery is just DB visibility — there is no external API to call —
// so the transport is a no-op and the visitor reads replies via webchat-poll.
//
// Policy parity with Telegram: a confident FAQ answer under `auto_eligible` is
// returned to the visitor immediately; anything LLM/fallback-drafted is held in
// the approval queue and the visitor only gets a neutral receipt (NOT the draft),
// so the human-approval gate is never bypassed.
//
// verify_jwt = false (public). Resolves provider with the service role.

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { runAgentTurn } from '../_shared/agent.ts';
import type { NormalizedInbound } from '../_shared/telegramParser.ts';
import { json, corsHeaders } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const MAX_LEN = 4000;

function buildInbound(sessionId: string, text: string, clientName?: string): NormalizedInbound {
  const name = (clientName || '').trim().slice(0, 80) || 'Web visitor';
  return {
    externalThreadId: sessionId,
    clientHandle: name,
    clientName: name,
    username: null,
    text,
    messageType: 'text',
    externalMessageId: `web-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let body: { slug?: string; sessionId?: string; text?: string; clientName?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const slug = (body.slug || '').trim().toLowerCase();
  const sessionId = (body.sessionId || '').trim();
  const text = (body.text || '').trim().slice(0, MAX_LEN);
  if (!slug || !sessionId || !text) return json({ error: 'missing_fields' }, 400);

  // Resolve the provider by public slug.
  const { data: profile } = await admin.from('profiles').select('id').eq('slug', slug).maybeSingle();
  if (!profile) return json({ error: 'unknown_provider' }, 404);
  const userId = profile.id as string;

  // The provider must have web chat enabled.
  const { data: channel } = await admin
    .from('agent_channels')
    .select('active')
    .eq('user_id', userId)
    .eq('channel', 'webchat')
    .maybeSingle();
  if (!channel || !channel.active) return json({ error: 'channel_disabled' }, 403);

  try {
    const result = await runAgentTurn(admin, {
      userId,
      channel: 'webchat',
      inbound: buildInbound(sessionId, text, body.clientName),
      // Web chat has no external send — delivery is DB visibility via webchat-poll.
      deliver: async () => ({ ok: true }),
    });

    // Replies — auto-sent or sent after provider approval — surface as real
    // records via webchat-poll. A held draft returns a silent 'received' ack with
    // NO receipt text, so the visitor experience never reveals that a reply is
    // automated, queued, or awaiting approval — it reads like a real person.
    if (result.autoSent && result.deliveryOk && result.draftText) {
      return json({ status: 'answered' });
    }
    return json({ status: 'received' });
  } catch (e) {
    return json({ error: 'handler_error', detail: String(e) }, 500);
  }
});
