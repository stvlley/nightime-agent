// Telegram webhook → agent runtime (Phase 2).
//
// Flow: verify the per-provider webhook secret → resolve the owning provider →
// persist the inbound message → run the free FAQ pre-filter → fall back to the
// cheap model only on a miss → write a draft into the approval queue (or
// auto-send when the provider opted in and the FAQ match is confident) → log.
//
// Runs as a Supabase Edge Function (Deno) with the service role, so RLS is
// bypassed here. Configure with `verify_jwt = false` (Telegram has no JWT).

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { parseTelegramUpdate, type NormalizedInbound } from '../_shared/telegramParser.ts';
import { decideResponse, FALLBACK_REPLY, type FaqEntry } from '../_shared/agentLogic.ts';
import { sendTelegramMessage } from '../_shared/telegram.ts';
import { generateReply } from '../_shared/llm.ts';
import { ack } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

type Admin = ReturnType<typeof createClient>;

interface EventLog {
  userId: string;
  threadId?: string | null;
  messageId?: string | null;
  kind: string;
  source?: string | null;
  intent?: string | null;
  confidence?: number | null;
  detail?: Record<string, unknown> | null;
}

async function logEvent(admin: Admin, e: EventLog): Promise<void> {
  await admin.from('agent_events').insert({
    user_id: e.userId,
    thread_id: e.threadId ?? null,
    message_id: e.messageId ?? null,
    kind: e.kind,
    source: e.source ?? null,
    intent: e.intent ?? null,
    confidence: e.confidence ?? null,
    detail: e.detail ?? null,
  });
}

async function upsertThread(
  admin: Admin,
  userId: string,
  inbound: NormalizedInbound,
): Promise<{ id: string; state: string | null }> {
  const { data: existing } = await admin
    .from('threads')
    .select('id, state')
    .eq('user_id', userId)
    .eq('channel', 'telegram')
    .eq('external_thread_id', inbound.externalThreadId)
    .maybeSingle();

  if (existing) return existing as { id: string; state: string | null };

  const { data: created, error } = await admin
    .from('threads')
    .insert({
      user_id: userId,
      channel: 'telegram',
      external_thread_id: inbound.externalThreadId,
      client_handle: inbound.clientHandle,
      state: 'open',
    })
    .select('id, state')
    .single();
  if (error) throw error;
  return created as { id: string; state: string | null };
}

function nextState(current: string | null, intent: string, _autoSent: boolean): string {
  if (intent === 'cancel') return 'cancelled';
  if ((!current || current === 'open') && (intent === 'booking' || intent === 'availability')) {
    return 'qualifying';
  }
  return current ?? 'open';
}

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
    const thread = await upsertThread(admin, userId, inbound);

    const { data: inMsg } = await admin
      .from('messages')
      .insert({
        user_id: userId,
        thread_id: thread.id,
        text: inbound.text,
        sender: 'client',
        direction: 'in',
        ai_generated: false,
      })
      .select('id')
      .single();

    await logEvent(admin, { userId, threadId: thread.id, messageId: inMsg?.id, kind: 'inbound_received' });

    // Provider context for the decision + any model fallback.
    const [prefsRes, faqRes, profileRes] = await Promise.all([
      admin
        .from('provider_preferences')
        .select('approval_mode, moderation_level, agent_tone, response_boundaries')
        .eq('user_id', userId)
        .maybeSingle(),
      admin.from('faq').select('id, trigger, reply_text, enabled').eq('user_id', userId).eq('enabled', true),
      admin.from('profiles').select('business_name').eq('id', userId).maybeSingle(),
    ]);

    const prefs = prefsRes.data;
    const faqs: FaqEntry[] = (faqRes.data ?? []).map((f: any) => ({
      id: f.id,
      trigger: f.trigger ?? '',
      reply: f.reply_text ?? '',
      enabled: f.enabled ?? true,
    }));

    const decision = decideResponse({
      inboundText: inbound.text,
      faqs,
      preferences: {
        approvalMode: (prefs?.approval_mode as any) ?? 'manual',
        moderationLevel: (prefs?.moderation_level as any) ?? 'medium',
      },
    });

    let draftText = decision.draftText;
    let source = decision.source;
    let model: string | null = null;

    if (decision.needsLlm) {
      const llm = await generateReply({
        inboundText: inbound.text,
        businessName: profileRes.data?.business_name,
        agentTone: prefs?.agent_tone,
        responseBoundaries: prefs?.response_boundaries,
        faqs,
      });
      if (llm.text) {
        draftText = llm.text;
        source = 'llm';
        model = llm.model;
        await logEvent(admin, { userId, threadId: thread.id, kind: 'llm_called', source: 'llm', detail: { model } });
      } else {
        draftText = FALLBACK_REPLY;
        source = 'fallback';
      }
    }

    const autoSend = decision.autoSendEligible && source === 'faq';
    const approvalStatus = autoSend ? 'auto_sent' : 'pending';

    const { data: draftMsg } = await admin
      .from('messages')
      .insert({
        user_id: userId,
        thread_id: thread.id,
        text: draftText,
        sender: 'ai',
        direction: 'out',
        ai_generated: true,
        ai_label: decision.intent,
        ai_confidence: decision.confidence,
        response_source: source,
        approval_status: approvalStatus,
        reply_to_message_id: inMsg?.id ?? null,
        delivered_at: autoSend ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    await logEvent(admin, {
      userId,
      threadId: thread.id,
      messageId: draftMsg?.id,
      kind: autoSend ? 'auto_sent' : 'draft_created',
      source,
      intent: decision.intent,
      confidence: decision.confidence,
    });

    if (autoSend && draftText && draftMsg) {
      const sent = await sendTelegramMessage(channel.bot_token as string, inbound.externalThreadId, draftText);
      if (!sent.ok) {
        await admin.from('messages').update({ approval_status: 'failed', delivered_at: null }).eq('id', draftMsg.id);
        await logEvent(admin, {
          userId,
          threadId: thread.id,
          messageId: draftMsg.id,
          kind: 'error',
          detail: { stage: 'auto_send', error: sent.error },
        });
      }
    }

    await admin
      .from('threads')
      .update({
        last_activity_at: new Date().toISOString(),
        state: nextState(thread.state, decision.intent, autoSend),
      })
      .eq('id', thread.id);
  } catch (e) {
    await logEvent(admin, { userId, kind: 'error', detail: { stage: 'handler', error: String(e) } });
  }

  return ack();
});
