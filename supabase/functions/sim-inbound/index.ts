// Channel simulation endpoint (testing / dev).
//
// Injects an inbound customer message on ANY channel — including email and SMS,
// which have no real transport yet — and runs the full agent loop, so every
// channel can be exercised in the unified inbox without external providers. This
// is the "simulate communication channels" path: send a test message, then view
// it (and the AI reply / booking) in the inbox.
//
// Not a public endpoint: callers must present the project service-role key in
// `x-sim-key`. In production nobody holds that key client-side, so this stays an
// admin/testing tool. verify_jwt = false (we do our own auth).

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { runAgentTurn } from '../_shared/agent.ts';
import type { NormalizedInbound } from '../_shared/telegramParser.ts';
import { json, corsHeaders } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CHANNELS = new Set(['gv', 'telegram', 'whatsapp', 'email', 'sms', 'webchat']);
const MAX_LEN = 4000;

function buildInbound(channel: string, from: string, text: string, name?: string): NormalizedInbound {
  const handle = from.trim().slice(0, 120) || 'sim-customer';
  return {
    // One thread per (channel, sender) — same identity model as the real channels.
    externalThreadId: `sim:${channel}:${handle}`,
    clientHandle: handle,
    clientName: (name || '').trim().slice(0, 80) || handle,
    username: null,
    text,
    messageType: 'text',
    externalMessageId: `sim-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Auth: service-role key only.
  if (!SERVICE_ROLE || req.headers.get('x-sim-key') !== SERVICE_ROLE) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: { userId?: string; slug?: string; channel?: string; from?: string; text?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const channel = (body.channel || '').trim().toLowerCase();
  const from = (body.from || '').trim();
  const text = (body.text || '').trim().slice(0, MAX_LEN);
  if (!CHANNELS.has(channel)) return json({ error: 'bad_channel', allowed: [...CHANNELS] }, 400);
  if (!from || !text) return json({ error: 'missing_fields' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Resolve the provider by explicit id or public slug.
  let userId = (body.userId || '').trim();
  if (!userId) {
    const slug = (body.slug || '').trim().toLowerCase();
    if (!slug) return json({ error: 'missing_provider' }, 400);
    const { data: profile } = await admin.from('profiles').select('id').eq('slug', slug).maybeSingle();
    if (!profile) return json({ error: 'unknown_provider' }, 404);
    userId = profile.id as string;
  }

  try {
    const result = await runAgentTurn(admin, {
      userId,
      channel,
      inbound: buildInbound(channel, from, text, body.name),
      // Simulation: outbound "delivery" is DB visibility in the unified inbox.
      deliver: async () => ({ ok: true }),
    });
    return json({
      ok: true,
      channel,
      threadId: result.threadId,
      source: result.source,
      intent: result.intent,
      autoSent: result.autoSent,
      reply: result.autoSent ? result.draftText : null,
      heldForApproval: !result.autoSent,
    });
  } catch (e) {
    return json({ error: 'handler_error', detail: String(e) }, 500);
  }
});
