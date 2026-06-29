// Cheap-model fallback for messages the FAQ pre-filter can't answer (IO, Deno).
//
// Cost control by design: this is only called when `decideResponse` returns
// needsLlm. It is gated on AGENT_LLM_DISABLED and OPENROUTER_API_KEY — with no
// key the caller uses the deterministic FALLBACK_REPLY instead, so the runtime
// still works at $0 before launch. Drafts produced here always require human
// approval in v1.

import type { FaqEntry } from './agentLogic.ts';

export interface LlmTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmContext {
  inboundText: string;
  businessName?: string | null;
  agentTone?: string | null;
  responseBoundaries?: string | null;
  faqs: FaqEntry[];
  /** Prior turns in this conversation (oldest first), so replies stay in context. */
  history?: LlmTurn[];
  model?: string | null;
  maxTokens?: number | null;
}

export interface LlmResult {
  text: string | null;
  model: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCostCents?: number | null;
  error?: string;
}

function maxTokens(value?: number | null): number {
  const parsed = Number(value ?? Deno.env.get('AGENT_LLM_MAX_TOKENS') ?? '180');
  if (!Number.isFinite(parsed)) return 180;
  return Math.max(32, Math.min(320, Math.round(parsed)));
}

function buildSystemPrompt(ctx: LlmContext): string {
  const lines: string[] = [
    `You are texting customers for ${ctx.businessName || 'an independent service provider'}. Reply as the business in the first person, the way a real person texts back — never say or imply you are an AI, a bot, an assistant, or automated.`,
    'Sound human: warm, relaxed, and brief. Usually one or two short sentences, like a real text message. Vary your wording and skip corporate filler ("we are here to assist you", "thank you for reaching out", "how may I help you today").',
    'Use the conversation so far for context — do not re-introduce yourself or repeat what was already said.',
    'Stay grounded: never invent or promise a specific time, price, service, or booking that is not given to you here. If you are unsure, say you will check and get right back to them.',
    'If a message is sensitive, ambiguous, or wants to lock in a firm commitment, give a short friendly holding reply saying you will follow up shortly.',
  ];
  if (ctx.agentTone) lines.push(`Match this tone: ${ctx.agentTone}.`);
  if (ctx.responseBoundaries) lines.push(`Always respect these boundaries: ${ctx.responseBoundaries}.`);
  const enabledFaqs = ctx.faqs.filter((f) => f.enabled !== false && f.trigger && f.reply);
  if (enabledFaqs.length) {
    lines.push('Facts you can use when relevant (rephrase naturally, do not quote verbatim):');
    for (const f of enabledFaqs.slice(0, 5)) {
      lines.push(`- ${f.trigger} → ${f.reply}`);
    }
  }
  return lines.join('\n');
}

function envCostCents(name: string): number {
  const parsed = Number(Deno.env.get(name) ?? '0');
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function estimateCostCents(inputTokens: number | null, outputTokens: number | null): number | null {
  if (inputTokens === null && outputTokens === null) return null;
  const inputPerMillion = envCostCents('AGENT_INPUT_COST_PER_1M_CENTS');
  const outputPerMillion = envCostCents('AGENT_OUTPUT_COST_PER_1M_CENTS');
  return ((inputTokens ?? 0) / 1_000_000) * inputPerMillion + ((outputTokens ?? 0) / 1_000_000) * outputPerMillion;
}

export async function generateReply(ctx: LlmContext): Promise<LlmResult> {
  if (Deno.env.get('AGENT_LLM_DISABLED') === 'true') {
    return { text: null, model: null, error: 'llm_disabled' };
  }

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  const model = ctx.model || Deno.env.get('AGENT_MODEL') || 'openrouter/free';
  if (!apiKey) return { text: null, model: null, error: 'no_api_key' };

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'http-referer': Deno.env.get('OPENROUTER_HTTP_REFERER') ?? 'https://nitime.app',
        'x-openrouter-title': Deno.env.get('OPENROUTER_APP_TITLE') ?? 'Nitime',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens(ctx.maxTokens),
        messages: [
          { role: 'system', content: buildSystemPrompt(ctx) },
          ...(ctx.history ?? []),
          { role: 'user', content: ctx.inboundText },
        ],
      }),
    });
    if (!res.ok) {
      return { text: null, model, error: `openrouter ${res.status}: ${await res.text()}` };
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    const inputTokens = typeof data?.usage?.prompt_tokens === 'number' ? data.usage.prompt_tokens : null;
    const outputTokens = typeof data?.usage?.completion_tokens === 'number' ? data.usage.completion_tokens : null;
    return {
      text: typeof text === 'string' ? text.trim() : null,
      model: typeof data?.model === 'string' ? data.model : model,
      inputTokens,
      outputTokens,
      estimatedCostCents: estimateCostCents(inputTokens, outputTokens),
    };
  } catch (e) {
    return { text: null, model, error: String(e) };
  }
}
