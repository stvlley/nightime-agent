// Cheap-model fallback for messages the FAQ pre-filter can't answer (IO, Deno).
//
// Cost control by design: this is only called when `decideResponse` returns
// needsLlm. It is gated on AGENT_LLM_DISABLED and OPENROUTER_API_KEY — with no
// key the caller uses the deterministic FALLBACK_REPLY instead, so the runtime
// still works at $0 before launch. Drafts produced here always require human
// approval in v1.

import type { FaqEntry } from './agentLogic.ts';

export interface LlmContext {
  inboundText: string;
  businessName?: string | null;
  agentTone?: string | null;
  responseBoundaries?: string | null;
  faqs: FaqEntry[];
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
    `You are a messaging assistant replying on behalf of ${ctx.businessName || 'an independent service provider'}.`,
    'You are drafting a reply to an inbound client message. The provider reviews every draft before it is sent, so never promise a specific time, price, or booking that is not already confirmed below.',
    'Keep replies short, warm, and professional. One or two sentences. Do not invent services, prices, or availability.',
    'If the message needs the provider personally (sensitive, ambiguous, or a firm commitment), write a brief holding reply that says you will get back to them shortly.',
  ];
  if (ctx.agentTone) lines.push(`Tone to use: ${ctx.agentTone}.`);
  if (ctx.responseBoundaries) lines.push(`Boundaries you must respect: ${ctx.responseBoundaries}.`);
  const enabledFaqs = ctx.faqs.filter((f) => f.enabled !== false && f.trigger && f.reply);
  if (enabledFaqs.length) {
    lines.push('Known answers you may use when relevant:');
    for (const f of enabledFaqs.slice(0, 5)) {
      lines.push(`- Q: ${f.trigger} | A: ${f.reply}`);
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
