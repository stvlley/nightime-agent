// Cheap-model fallback for messages the FAQ pre-filter can't answer (IO, Deno).
//
// Cost control by design: this is only called when `decideResponse` returns
// needsLlm. It is gated entirely on ANTHROPIC_API_KEY — with no key the caller
// uses the deterministic FALLBACK_REPLY instead, so the runtime still works at
// $0 before launch. Drafts produced here always require human approval in v1.

import type { FaqEntry } from './agentLogic.ts';

export interface LlmContext {
  inboundText: string;
  businessName?: string | null;
  agentTone?: string | null;
  responseBoundaries?: string | null;
  faqs: FaqEntry[];
}

export interface LlmResult {
  text: string | null;
  model: string | null;
  error?: string;
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
    for (const f of enabledFaqs.slice(0, 20)) {
      lines.push(`- Q: ${f.trigger} | A: ${f.reply}`);
    }
  }
  return lines.join('\n');
}

export async function generateReply(ctx: LlmContext): Promise<LlmResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const model = Deno.env.get('AGENT_MODEL') ?? 'claude-haiku-4-5';
  if (!apiKey) return { text: null, model: null, error: 'no_api_key' };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 320,
        system: buildSystemPrompt(ctx),
        messages: [{ role: 'user', content: ctx.inboundText }],
      }),
    });
    if (!res.ok) {
      return { text: null, model, error: `anthropic ${res.status}: ${await res.text()}` };
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    return { text: typeof text === 'string' ? text.trim() : null, model };
  } catch (e) {
    return { text: null, model, error: String(e) };
  }
}
