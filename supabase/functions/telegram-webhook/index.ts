// Telegram webhook → agent runtime (Phase 2).
//
// This function is now thin: it authenticates the inbound call by the
// per-provider `X-Telegram-Bot-Api-Secret-Token`, resolves the owning provider,
// normalizes the Telegram update, and hands off to the shared, channel-agnostic
// `runAgentTurn` (../_shared/agent.ts) — the same loop the web-chat channel uses.
// The only Telegram-specific piece left here is the transport: deliver() hits the
// Bot API.
//
// Runs as a Supabase Edge Function (Deno) with the service role, so RLS is
// bypassed here. Configure with `verify_jwt = false` (Telegram has no JWT).

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { parseTelegramUpdate } from '../_shared/telegramParser.ts';
import { runAgentTurn, logEvent } from '../_shared/agent.ts';
import { sendTelegramMessage } from '../_shared/telegram.ts';
import { ack } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let update: unknown;
  try {
    update = await req.json();
  } catch {
    return ack();
  }

  // Authenticate + resolve provider by the webhook secret Telegram echoes back.
  const secret = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!secret) return ack();
  const { data: channel } = await admin
    .from('agent_channels')
    .select('id, user_id, bot_token, active')
    .eq('channel', 'telegram')
    .eq('webhook_secret', secret)
    .maybeSingle();
  if (!channel || !channel.active) return ack();

  const inbound = parseTelegramUpdate(update);
  if (!inbound || !inbound.text.trim()) return ack();

  const userId = channel.user_id as string;

  try {
    await runAgentTurn(admin, {
      userId,
      channel: 'telegram',
      inbound,
      deliver: (text) =>
        sendTelegramMessage(channel.bot_token as string, inbound.externalThreadId, text),
    });
  } catch (e) {
    await logEvent(admin, { userId, kind: 'error', detail: { stage: 'handler', error: String(e) } });
  }

  return ack();
});
