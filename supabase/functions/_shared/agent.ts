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
  exceededAgentCallCaps,
  exceededAgentCaps,
  FALLBACK_REPLY,
  llmReplyPassesAutoSendSafety,
  resolveAgentModeConfig,
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
  channel?: string | null;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCostCents?: number | null;
  autoSend?: boolean | null;
  approvalStatus?: string | null;
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
    channel: e.channel ?? null,
    model: e.model ?? null,
    input_tokens: e.inputTokens ?? null,
    output_tokens: e.outputTokens ?? null,
    estimated_cost_cents: e.estimatedCostCents ?? null,
    auto_send: e.autoSend ?? null,
    approval_status: e.approvalStatus ?? null,
    detail: e.detail ?? null,
  });
}

function startOfDayISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthISO(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function sumEstimatedCost(rows: any[] | null): number {
  return (rows ?? []).reduce((sum, row) => {
    const value = Number(row?.estimated_cost_cents ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

async function getAgentSpend(
  admin: Admin,
  userId: string,
  threadId: string,
): Promise<{ dailyCents: number; monthlyCents: number; threadCents: number }> {
  const [dailyRes, monthlyRes, threadRes] = await Promise.all([
    admin
      .from('agent_events')
      .select('estimated_cost_cents')
      .eq('user_id', userId)
      .eq('source', 'llm')
      .eq('kind', 'llm_called')
      .gte('created_at', startOfDayISO())
      .limit(1000),
    admin
      .from('agent_events')
      .select('estimated_cost_cents')
      .eq('user_id', userId)
      .eq('source', 'llm')
      .eq('kind', 'llm_called')
      .gte('created_at', startOfMonthISO())
      .limit(1000),
    admin
      .from('agent_events')
      .select('estimated_cost_cents')
      .eq('user_id', userId)
      .eq('thread_id', threadId)
      .eq('source', 'llm')
      .eq('kind', 'llm_called')
      .limit(1000),
  ]);

  return {
    dailyCents: sumEstimatedCost(dailyRes.data as any[] | null),
    monthlyCents: sumEstimatedCost(monthlyRes.data as any[] | null),
    threadCents: sumEstimatedCost(threadRes.data as any[] | null),
  };
}

async function countLlmCalls(
  admin: Admin,
  userId: string,
  sinceIso: string,
  threadId?: string,
): Promise<number> {
  let query = admin
    .from('agent_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'llm')
    .eq('kind', 'llm_called')
    .gte('created_at', sinceIso);

  if (threadId) query = query.eq('thread_id', threadId);

  const { count } = await query;
  return count ?? 0;
}

async function getAgentCallUsage(
  admin: Admin,
  userId: string,
  threadId: string,
): Promise<{ dailyCalls: number; monthlyCalls: number; threadCalls: number }> {
  const day = startOfDayISO();
  const month = startOfMonthISO();
  const [dailyCalls, monthlyCalls, threadCalls] = await Promise.all([
    countLlmCalls(admin, userId, day),
    countLlmCalls(admin, userId, month),
    countLlmCalls(admin, userId, day, threadId),
  ]);

  return { dailyCalls, monthlyCalls, threadCalls };
}

function nullablePositiveNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function capOrDefault(value: unknown, fallback: number): number {
  if (value === 0) return 0;
  const explicit = nullablePositiveNumber(value);
  return explicit ?? fallback;
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

  await logEvent(admin, { userId, threadId: thread.id, messageId: inMsg?.id, kind: 'inbound_received', source: channel, channel });

  const [prefsRes, faqRes, profileRes] = await Promise.all([
    admin
      .from('provider_preferences')
      .select(
        'approval_mode, moderation_level, agent_mode, agent_tone, response_boundaries, llm_enabled, ai_daily_cap_cents, ai_monthly_cap_cents, ai_thread_cap_cents, ai_daily_call_cap, ai_monthly_call_cap, ai_thread_call_cap, ai_cap_behavior'
      )
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
      agentMode: (prefs?.agent_mode as any) ?? 'keep_up',
    },
  });
  const modeConfig = resolveAgentModeConfig(prefs?.agent_mode as any, {
    AGENT_MODEL_KEEP_UP: Deno.env.get('AGENT_MODEL_KEEP_UP') ?? undefined,
    AGENT_MODEL_HELP_RESPOND: Deno.env.get('AGENT_MODEL_HELP_RESPOND') ?? undefined,
    AGENT_MODEL_TALK_FOR_ME: Deno.env.get('AGENT_MODEL_TALK_FOR_ME') ?? undefined,
    AGENT_MODEL: Deno.env.get('AGENT_MODEL') ?? undefined,
  });

  let draftText = decision.draftText;
  let source: ResponseSource = decision.source;
  let model: string | null = null;
  let llmAutoSendCandidate = false;

  if (decision.needsLlm) {
    const llmEnabled = prefs?.llm_enabled !== false;
    const [spend, usage] = await Promise.all([
      getAgentSpend(admin, userId, thread.id),
      getAgentCallUsage(admin, userId, thread.id),
    ]);
    const exceededCostCaps = exceededAgentCaps(
      {
        dailyCents: prefs?.ai_daily_cap_cents,
        monthlyCents: prefs?.ai_monthly_cap_cents,
        threadCents: prefs?.ai_thread_cap_cents,
      },
      spend,
    );
    const exceededCallCaps = exceededAgentCallCaps(
      {
        dailyCalls: capOrDefault(prefs?.ai_daily_call_cap, modeConfig.dailyCallCap),
        monthlyCalls: capOrDefault(prefs?.ai_monthly_call_cap, modeConfig.monthlyCallCap),
        threadCalls: capOrDefault(prefs?.ai_thread_call_cap, modeConfig.threadCallCap),
      },
      usage,
    );

    if (!llmEnabled) {
      draftText = FALLBACK_REPLY;
      source = 'fallback';
      await logEvent(admin, {
        userId,
        threadId: thread.id,
        kind: 'fallback_used',
        source: 'fallback',
        channel,
        detail: { reason: 'provider_llm_disabled' },
      });
    } else if (exceededCostCaps.length > 0 || exceededCallCaps.length > 0) {
      draftText = FALLBACK_REPLY;
      source = 'fallback';
      await logEvent(admin, {
        userId,
        threadId: thread.id,
        kind: 'cap_reached',
        source: 'fallback',
        channel,
        detail: {
          costCaps: exceededCostCaps,
          callCaps: exceededCallCaps,
          spend,
          usage,
          behavior: prefs?.ai_cap_behavior ?? 'fallback',
        },
      });
    } else {
      const llm = await generateReply({
        inboundText: inbound.text,
        businessName: (profileRes.data as any)?.business_name,
        agentTone: prefs?.agent_tone,
        responseBoundaries: prefs?.response_boundaries,
        faqs,
        model: modeConfig.model,
        maxTokens: modeConfig.maxTokens,
      });
      model = llm.model;
      await logEvent(admin, {
        userId,
        threadId: thread.id,
        kind: 'llm_called',
        source: 'llm',
        channel,
        model,
        inputTokens: llm.inputTokens ?? null,
        outputTokens: llm.outputTokens ?? null,
        estimatedCostCents: llm.estimatedCostCents ?? null,
        detail: llm.error ? { error: llm.error } : null,
      });
      if (llm.text) {
        draftText = llm.text;
        source = 'llm';
        llmAutoSendCandidate =
          decision.autoSendEligible && llmReplyPassesAutoSendSafety(draftText);
      } else {
        draftText = FALLBACK_REPLY;
        source = 'fallback';
        await logEvent(admin, {
          userId,
          threadId: thread.id,
          kind: 'fallback_used',
          source: 'fallback',
          channel,
          model,
          detail: { reason: llm.error ?? 'empty_llm_response' },
        });
      }
    }
  } else if (source === 'fallback') {
    await logEvent(admin, {
      userId,
      threadId: thread.id,
      kind: 'fallback_used',
      source: 'fallback',
      channel,
      detail: { reason: decision.reason },
    });
  }

  const autoSend =
    (source === 'faq' && decision.autoSendEligible) ||
    (source === 'llm' && llmAutoSendCandidate);
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
    channel,
    model,
    autoSend,
    approvalStatus,
    detail: { reason: decision.reason, mode: modeConfig.mode },
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
        source,
        channel,
        autoSend,
        approvalStatus: 'failed',
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
