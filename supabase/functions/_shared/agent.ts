// Channel-agnostic agent orchestration (Phase 2).
//
// This is the one message loop, extracted from the Telegram webhook so every
// channel (Telegram, web chat, future email/WhatsApp) runs identical behavior:
// persist inbound → free FAQ pre-filter → cheap-model fallback only on a miss →
// approval queue (or auto-send when eligible) → observability log → thread state.
//
// Channels differ ONLY in transport: how an inbound arrives (each channel builds
// a NormalizedInbound) and how an outbound is delivered (the injected `deliver`).
// For Telegram, deliver hits the Bot API; for web chat, "delivery" is just DB
// visibility, so deliver is a no-op that resolves ok.
//
// Pure-logic decisions live in agentLogic.ts (shared with vitest). This module
// does the Supabase IO and is Deno-only.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.55.0';
import type { NormalizedInbound } from './telegramParser.ts';
import {
  decideResponse,
  FALLBACK_REPLY,
  type FaqEntry,
  type MessageIntent,
  type ResponseSource,
} from './agentLogic.ts';
import { generateReply } from './llm.ts';

type Admin = SupabaseClient;

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** Delivers an auto-sendable outbound. Telegram → Bot API; web chat → no-op (DB visibility). */
export type Deliver = (text: string) => Promise<SendResult>;

export interface EventLog {
  userId: string;
  threadId?: string | null;
  messageId?: string | null;
  kind: string;
  source?: string | null;
  intent?: string | null;
  confidence?: number | null;
  detail?: Record<string, unknown> | null;
}

export async function logEvent(admin: Admin, e: EventLog): Promise<void> {
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
  channel: string,
  inbound: NormalizedInbound,
): Promise<{ id: string; state: string | null }> {
  const { data: existing } = await admin
    .from('threads')
    .select('id, state')
    .eq('user_id', userId)
    .eq('channel', channel)
    .eq('external_thread_id', inbound.externalThreadId)
    .maybeSingle();

  if (existing) return existing as { id: string; state: string | null };

  const { data: created, error } = await admin
    .from('threads')
    .insert({
      user_id: userId,
      channel,
      external_thread_id: inbound.externalThreadId,
      client_handle: inbound.clientHandle,
      state: 'open',
    })
    .select('id, state')
    .single();
  if (error) throw error;
  return created as { id: string; state: string | null };
}

function nextState(current: string | null, intent: string): string {
  if (intent === 'cancel') return 'cancelled';
  if ((!current || current === 'open') && (intent === 'booking' || intent === 'availability')) {
    return 'qualifying';
  }
  return current ?? 'open';
}

export interface TurnResult {
  threadId: string;
  inboundMessageId: string | null;
  draftMessageId: string | null;
  draftText: string | null;
  source: ResponseSource;
  intent: MessageIntent;
  confidence: number;
  /** Delivered immediately without human approval (confident FAQ, eligible, unflagged). */
  autoSent: boolean;
  /** Result of deliver() when autoSent; false means delivery failed. */
  deliveryOk: boolean;
  flaggedForReview: boolean;
}

/**
 * Run one inbound message through the agent loop for any channel.
 * `deliver` is only invoked when the reply is auto-send eligible.
 */
export async function runAgentTurn(
  admin: Admin,
  params: { userId: string; channel: string; inbound: NormalizedInbound; deliver: Deliver },
): Promise<TurnResult> {
  const { userId, channel, inbound, deliver } = params;

  const thread = await upsertThread(admin, userId, channel, inbound);

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

  await logEvent(admin, { userId, threadId: thread.id, messageId: inMsg?.id, kind: 'inbound_received', source: channel });

  const [prefsRes, faqRes, profileRes] = await Promise.all([
    admin
      .from('provider_preferences')
      .select('approval_mode, moderation_level, agent_tone, response_boundaries')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('faq').select('id, trigger, reply_text, enabled').eq('user_id', userId).eq('enabled', true),
    admin.from('profiles').select('business_name').eq('id', userId).maybeSingle(),
  ]);

  const prefs = prefsRes.data as any;
  const faqs: FaqEntry[] = ((faqRes.data ?? []) as any[]).map((f) => ({
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
  let source: ResponseSource = decision.source;
  let model: string | null = null;

  if (decision.needsLlm) {
    const llm = await generateReply({
      inboundText: inbound.text,
      businessName: (profileRes.data as any)?.business_name,
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

  let deliveryOk = true;
  if (autoSend && draftText && draftMsg) {
    const sent = await deliver(draftText);
    deliveryOk = sent.ok;
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
    .update({ last_activity_at: new Date().toISOString(), state: nextState(thread.state, decision.intent) })
    .eq('id', thread.id);

  return {
    threadId: thread.id,
    inboundMessageId: inMsg?.id ?? null,
    draftMessageId: draftMsg?.id ?? null,
    draftText,
    source,
    intent: decision.intent,
    confidence: decision.confidence,
    autoSent: autoSend,
    deliveryOk,
    flaggedForReview: decision.flaggedForReview,
  };
}
