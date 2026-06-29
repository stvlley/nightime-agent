import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateReply } from '../supabase/functions/_shared/llm';
import type { FaqEntry } from '../supabase/functions/_shared/agentLogic';

// generateReply is Deno-only (Deno.env + fetch). The module is import-safe under
// vitest because Deno.env.get is only called inside functions, so we stub the
// Deno global and fetch per-test and restore them afterward.

const FAQS: FaqEntry[] = [
  { trigger: 'What are your hours?', reply: 'Tuesday to Saturday, 10am to 8pm.', enabled: true },
  { trigger: 'Where are you located?', reply: 'Downtown studio.', enabled: true },
];

let lastInit: RequestInit | null = null;

function stubEnv(map: Record<string, string | undefined>) {
  (globalThis as any).Deno = { env: { get: (k: string) => map[k] } };
}

/** A fetch stub that records the request and returns a canned Response-like object. */
function stubFetch(response: { ok?: boolean; status?: number; json?: any; text?: string }) {
  const fn = vi.fn(async (_url: string, init: RequestInit) => {
    lastInit = init;
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.json,
      text: async () => response.text ?? '',
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function successPayload(overrides: Record<string, any> = {}) {
  return {
    model: 'openrouter/free',
    choices: [{ message: { content: '  Sure, happy to help with that.  ' } }],
    usage: { prompt_tokens: 120, completion_tokens: 30 },
    ...overrides,
  };
}

function sentMessages(): Array<{ role: string; content: string }> {
  return JSON.parse(String(lastInit!.body)).messages;
}

beforeEach(() => {
  lastInit = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as any).Deno;
});

describe('generateReply — gating', () => {
  it('returns llm_disabled without calling fetch when AGENT_LLM_DISABLED=true', async () => {
    stubEnv({ AGENT_LLM_DISABLED: 'true', OPENROUTER_API_KEY: 'sk-test' });
    const fetchFn = stubFetch({ json: successPayload() });

    const res = await generateReply({ inboundText: 'hi', faqs: FAQS });

    expect(res).toEqual({ text: null, model: null, error: 'llm_disabled' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns no_api_key without calling fetch when the key is absent', async () => {
    stubEnv({ AGENT_LLM_DISABLED: 'false' });
    const fetchFn = stubFetch({ json: successPayload() });

    const res = await generateReply({ inboundText: 'hi', faqs: FAQS });

    expect(res).toEqual({ text: null, model: null, error: 'no_api_key' });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('generateReply — success path', () => {
  it('parses trimmed text, model, token counts, and estimated cost', async () => {
    stubEnv({
      OPENROUTER_API_KEY: 'sk-test',
      AGENT_INPUT_COST_PER_1M_CENTS: '50',
      AGENT_OUTPUT_COST_PER_1M_CENTS: '100',
    });
    stubFetch({ json: successPayload() });

    const res = await generateReply({ inboundText: 'how does this work?', faqs: FAQS });

    expect(res.text).toBe('Sure, happy to help with that.');
    expect(res.model).toBe('openrouter/free');
    expect(res.inputTokens).toBe(120);
    expect(res.outputTokens).toBe(30);
    // 120/1e6*50 + 30/1e6*100 = 0.006 + 0.003 = 0.009
    expect(res.estimatedCostCents).toBeCloseTo(0.009, 10);
    expect(res.error).toBeUndefined();
  });

  it('falls back to the requested model and null tokens when usage is absent', async () => {
    stubEnv({ OPENROUTER_API_KEY: 'sk-test' });
    stubFetch({ json: { choices: [{ message: { content: 'hello' } }] } });

    const res = await generateReply({ inboundText: 'hi', faqs: FAQS, model: 'custom/model' });

    expect(res.text).toBe('hello');
    expect(res.model).toBe('custom/model');
    expect(res.inputTokens).toBeNull();
    expect(res.outputTokens).toBeNull();
    expect(res.estimatedCostCents).toBeNull();
  });

  it('returns null text when the response has no message content', async () => {
    stubEnv({ OPENROUTER_API_KEY: 'sk-test' });
    stubFetch({ json: { model: 'm', choices: [] } });

    const res = await generateReply({ inboundText: 'hi', faqs: FAQS });
    expect(res.text).toBeNull();
  });
});

describe('generateReply — errors', () => {
  it('surfaces a non-OK HTTP status', async () => {
    stubEnv({ OPENROUTER_API_KEY: 'sk-test' });
    stubFetch({ ok: false, status: 429, text: 'rate limited' });

    const res = await generateReply({ inboundText: 'hi', faqs: FAQS });

    expect(res.text).toBeNull();
    expect(res.error).toMatch(/^openrouter 429:/);
    expect(res.error).toContain('rate limited');
  });

  it('catches a thrown fetch and returns the stringified error', async () => {
    stubEnv({ OPENROUTER_API_KEY: 'sk-test' });
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));

    const res = await generateReply({ inboundText: 'hi', faqs: FAQS });

    expect(res.text).toBeNull();
    expect(res.error).toContain('network down');
  });
});

describe('generateReply — system prompt', () => {
  it('embeds business name, tone, boundaries, and the inbound text', async () => {
    stubEnv({ OPENROUTER_API_KEY: 'sk-test' });
    stubFetch({ json: successPayload() });

    await generateReply({
      inboundText: 'do you have parking?',
      businessName: 'Luna Wellness',
      agentTone: 'warm and professional',
      responseBoundaries: 'No explicit content.',
      faqs: FAQS,
    });

    const messages = sentMessages();
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('Luna Wellness');
    expect(messages[0].content).toContain('warm and professional');
    expect(messages[0].content).toContain('No explicit content.');
    expect(messages[1]).toEqual({ role: 'user', content: 'do you have parking?' });
  });

  it('includes only enabled, complete FAQs and caps them at 5', async () => {
    stubEnv({ OPENROUTER_API_KEY: 'sk-test' });
    stubFetch({ json: successPayload() });

    const manyFaqs: FaqEntry[] = [
      { trigger: 'Q1', reply: 'A1', enabled: true },
      { trigger: 'Q2', reply: 'A2', enabled: false }, // disabled → excluded
      { trigger: '', reply: 'A3', enabled: true }, // blank trigger → excluded
      { trigger: 'Q4', reply: 'A4', enabled: true },
      { trigger: 'Q5', reply: 'A5', enabled: true },
      { trigger: 'Q6', reply: 'A6', enabled: true },
      { trigger: 'Q7', reply: 'A7', enabled: true },
      { trigger: 'Q8', reply: 'A8', enabled: true }, // beyond the first 5 enabled → dropped
    ];

    await generateReply({ inboundText: 'hi', faqs: manyFaqs });

    const prompt = sentMessages()[0].content;
    expect(prompt).toContain('Q1');
    expect(prompt).not.toContain('Q2'); // disabled
    expect(prompt).not.toContain('A3'); // blank trigger
    expect(prompt).toContain('Q7'); // 5th enabled (Q1,Q4,Q5,Q6,Q7)
    expect(prompt).not.toContain('Q8'); // 6th enabled, dropped by slice(0,5)
  });
});

describe('generateReply — max_tokens', () => {
  async function maxTokensFor(opts: { ctx?: number | null; env?: string }): Promise<number> {
    stubEnv({ OPENROUTER_API_KEY: 'sk-test', AGENT_LLM_MAX_TOKENS: opts.env });
    stubFetch({ json: successPayload() });
    await generateReply({ inboundText: 'hi', faqs: FAQS, maxTokens: opts.ctx ?? undefined });
    return JSON.parse(String(lastInit!.body)).max_tokens;
  }

  it('defaults to 180 when unset', async () => {
    expect(await maxTokensFor({})).toBe(180);
  });

  it('clamps to the [32, 320] range', async () => {
    expect(await maxTokensFor({ ctx: 5 })).toBe(32);
    expect(await maxTokensFor({ ctx: 9999 })).toBe(320);
    expect(await maxTokensFor({ ctx: 200 })).toBe(200);
  });

  it('reads AGENT_LLM_MAX_TOKENS when ctx value is absent', async () => {
    expect(await maxTokensFor({ env: '64' })).toBe(64);
  });
});
