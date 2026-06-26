import { describe, expect, it } from 'vitest';
import {
  AGENT_MODE_DEFAULTS,
  classifyIntent,
  decideResponse,
  exceededAgentCallCaps,
  exceededAgentCaps,
  llmReplyPassesAutoSendSafety,
  matchFaq,
  normalizeText,
  resolveAgentModeConfig,
  screenContent,
  tokenize,
  FAQ_AUTO_THRESHOLD,
  type FaqEntry,
} from '../supabase/functions/_shared/agentLogic';

const FAQS: FaqEntry[] = [
  { id: '1', trigger: 'What are your rates?', reply: '60 min is $80, 90 min is $120.', enabled: true },
  { id: '2', trigger: 'Where are you located?', reply: "I'll share the address once booked.", enabled: false },
  { id: '3', trigger: 'Do you offer deep tissue massage?', reply: 'Yes, deep tissue is available.', enabled: true },
];

describe('normalizeText / tokenize', () => {
  it('lowercases, strips punctuation, drops stop words', () => {
    expect(normalizeText('What ARE your Rates?!')).toBe('what are your rates');
    expect(tokenize('What are your rates?')).toEqual(['rates']);
  });
});

describe('matchFaq', () => {
  it('matches on keyword overlap regardless of phrasing', () => {
    const m = matchFaq('hey, what are the rates for a session?', FAQS);
    expect(m?.faq.id).toBe('1');
    expect(m!.confidence).toBeGreaterThanOrEqual(FAQ_AUTO_THRESHOLD);
  });

  it('gives a high score when the full trigger phrase appears', () => {
    const m = matchFaq('Where are you located exactly?', [
      { trigger: 'Where are you located', reply: 'x', enabled: true },
    ]);
    expect(m!.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('matches common pricing wording to a saved rates response', () => {
    const m = matchFaq('how much is a session?', FAQS);
    expect(m?.faq.id).toBe('1');
    expect(m!.confidence).toBeGreaterThanOrEqual(FAQ_AUTO_THRESHOLD);
  });

  it('matches a stop-word-only greeting saved response', () => {
    const m = matchFaq('Hi', [
      { trigger: 'Hi', reply: 'Hi, how can I help?', enabled: true },
    ]);
    expect(m?.faq.reply).toContain('how can I help');
    expect(m!.confidence).toBeGreaterThanOrEqual(FAQ_AUTO_THRESHOLD);
  });

  it('matches greeting variants to a greeting saved response', () => {
    const m = matchFaq('hey there', [
      { trigger: 'Hello', reply: 'Hello, thanks for reaching out.', enabled: true },
    ]);
    expect(m?.faq.reply).toContain('thanks');
    expect(m!.confidence).toBeGreaterThanOrEqual(FAQ_AUTO_THRESHOLD);
  });

  it('does not treat greetings as FAQ hits without an enabled greeting response', () => {
    expect(matchFaq('hi', FAQS)).toBeNull();
  });

  it('does not match a short greeting trigger inside another word', () => {
    expect(matchFaq('this works', [{ trigger: 'hi', reply: 'hello', enabled: true }])).toBeNull();
  });

  it('matches short typo variants for saved responses', () => {
    const m = matchFaq('pricng?', [
      { trigger: 'pricing', reply: 'My current rates are listed here.', enabled: true },
    ]);
    expect(m?.faq.reply).toContain('rates');
    expect(m!.confidence).toBeGreaterThanOrEqual(FAQ_AUTO_THRESHOLD);
  });

  it('matches availability wording to a saved availability response', () => {
    const m = matchFaq('are you free tomorrow afternoon?', [
      { trigger: 'What is your availability?', reply: 'I have openings this week.', enabled: true },
    ]);
    expect(m?.faq.reply).toContain('openings');
    expect(m!.confidence).toBeGreaterThanOrEqual(FAQ_AUTO_THRESHOLD);
  });

  it('skips disabled FAQs', () => {
    const m = matchFaq('where are you located', FAQS);
    expect(m).toBeNull();
  });

  it('skips disabled greeting responses', () => {
    const m = matchFaq('hello', [
      { trigger: 'Hi', reply: 'Hi there.', enabled: false },
    ]);
    expect(m).toBeNull();
  });

  it('returns null when nothing overlaps', () => {
    expect(matchFaq('do you have parking nearby', FAQS)).toBeNull();
  });
});

describe('classifyIntent', () => {
  it.each([
    ['I want to cancel my appointment', 'cancel'],
    ['can we reschedule to friday', 'reschedule'],
    ['how much does it cost', 'pricing'],
    ['can I book a session tomorrow', 'booking'],
    ['are you available tonight', 'availability'],
    ['hello there', 'greeting'],
    ['the weather is nice', 'other'],
  ])('classifies %s as %s', (text, expected) => {
    expect(classifyIntent(text)).toBe(expected);
  });
});

describe('screenContent', () => {
  it('flags always-blocked terms at any level', () => {
    expect(screenContent('is this ok if I am underage', 'low')).toBe(true);
  });
  it('only flags strict-extra terms at strict level', () => {
    expect(screenContent('cash only please', 'medium')).toBe(false);
    expect(screenContent('cash only please', 'strict')).toBe(true);
  });
});

describe('exceededAgentCaps', () => {
  it('treats zero or missing caps as unlimited', () => {
    expect(
      exceededAgentCaps(
        { dailyCents: 0, monthlyCents: null, threadCents: undefined },
        { dailyCents: 100, monthlyCents: 100, threadCents: 100 }
      )
    ).toEqual([]);
  });

  it('returns every reached positive cap', () => {
    expect(
      exceededAgentCaps(
        { dailyCents: 50, monthlyCents: 1000, threadCents: 25 },
        { dailyCents: 50, monthlyCents: 200, threadCents: 30 }
      )
    ).toEqual(['daily', 'thread']);
  });
});

describe('agent mode routing defaults', () => {
  it('maps each mode to the expected model, token limit, and call caps', () => {
    expect(AGENT_MODE_DEFAULTS.keep_up).toMatchObject({
      model: 'openrouter/free',
      maxTokens: 120,
      dailyCallCap: 40,
      monthlyCallCap: 500,
      threadCallCap: 2,
    });
    expect(AGENT_MODE_DEFAULTS.help_respond).toMatchObject({
      model: 'google/gemini-2.5-flash-lite',
      maxTokens: 180,
      dailyCallCap: 150,
      monthlyCallCap: 2000,
      threadCallCap: 4,
    });
    expect(AGENT_MODE_DEFAULTS.talk_for_me).toMatchObject({
      model: 'openai/gpt-4.1-mini',
      maxTokens: 220,
      dailyCallCap: 300,
      monthlyCallCap: 5000,
      threadCallCap: 6,
    });
  });

  it('honors per-mode model overrides', () => {
    expect(
      resolveAgentModeConfig('help_respond', {
        AGENT_MODEL_HELP_RESPOND: 'custom/help-model',
      }).model
    ).toBe('custom/help-model');
  });

  it('checks LLM call caps separately from cost caps', () => {
    expect(
      exceededAgentCallCaps(
        { dailyCalls: 2, monthlyCalls: 20, threadCalls: 1 },
        { dailyCalls: 2, monthlyCalls: 3, threadCalls: 1 }
      )
    ).toEqual(['daily', 'thread']);
  });
});

describe('decideResponse', () => {
  it('answers from FAQ and auto-sends when auto_eligible + clean', () => {
    const d = decideResponse({
      inboundText: 'what are your rates?',
      faqs: FAQS,
      preferences: { approvalMode: 'auto_eligible', moderationLevel: 'medium' },
    });
    expect(d.source).toBe('faq');
    expect(d.draftText).toContain('$80');
    expect(d.needsLlm).toBe(false);
    expect(d.autoSendEligible).toBe(true);
  });

  it('auto-sends a saved greeting response when auto_eligible + clean', () => {
    const d = decideResponse({
      inboundText: 'Hi',
      faqs: [{ trigger: 'Hi', reply: 'Hi, how can I help?', enabled: true }],
      preferences: { approvalMode: 'auto_eligible', moderationLevel: 'medium' },
    });
    expect(d.source).toBe('faq');
    expect(d.draftText).toContain('how can I help');
    expect(d.autoSendEligible).toBe(true);
  });

  it('keeps FAQ answers in the approval queue under manual mode', () => {
    const d = decideResponse({
      inboundText: 'what are your rates?',
      faqs: FAQS,
      preferences: { approvalMode: 'manual', moderationLevel: 'medium' },
    });
    expect(d.source).toBe('faq');
    expect(d.autoSendEligible).toBe(false);
  });

  it('never auto-sends a flagged message even with a FAQ match', () => {
    const d = decideResponse({
      inboundText: 'what are your rates? also I am underage',
      faqs: FAQS,
      preferences: { approvalMode: 'auto_eligible', moderationLevel: 'medium' },
    });
    expect(d.flaggedForReview).toBe(true);
    expect(d.autoSendEligible).toBe(false);
  });

  it('routes to the LLM (needs approval) on an FAQ miss', () => {
    const d = decideResponse({
      inboundText: 'do you have parking?',
      faqs: FAQS,
      preferences: { approvalMode: 'auto_eligible', moderationLevel: 'medium' },
    });
    expect(d.needsLlm).toBe(true);
    expect(d.source).toBe('llm');
    expect(d.draftText).toBeNull();
    expect(d.autoSendEligible).toBe(false);
  });

  it('uses the selected level to decide whether open-ended messages call the model', () => {
    const keepUp = decideResponse({
      inboundText: 'tell me more about how this works',
      faqs: FAQS,
      preferences: { approvalMode: 'manual', moderationLevel: 'medium', agentMode: 'keep_up' },
    });
    const unknownHelp = decideResponse({
      inboundText: 'blue',
      faqs: FAQS,
      preferences: { approvalMode: 'manual', moderationLevel: 'medium', agentMode: 'help_respond' },
    });
    const unknownTalk = decideResponse({
      inboundText: 'blue',
      faqs: FAQS,
      preferences: { approvalMode: 'manual', moderationLevel: 'medium', agentMode: 'talk_for_me' },
    });

    expect(keepUp.source).toBe('llm');
    expect(keepUp.reason).toBe('conversation_requested');
    expect(unknownHelp.source).toBe('fallback');
    expect(unknownHelp.needsLlm).toBe(false);
    expect(unknownTalk.source).toBe('llm');
  });

  it('never auto-sends sensitive or firm-commitment messages', () => {
    const sensitive = decideResponse({
      inboundText: 'I am underage, can I book?',
      faqs: FAQS,
      preferences: { approvalMode: 'auto_eligible', moderationLevel: 'medium', agentMode: 'talk_for_me' },
    });
    const firm = decideResponse({
      inboundText: 'That works for me, confirm it',
      faqs: FAQS,
      preferences: { approvalMode: 'auto_eligible', moderationLevel: 'medium', agentMode: 'talk_for_me' },
    });

    expect(sensitive.autoSendEligible).toBe(false);
    expect(sensitive.source).toBe('fallback');
    expect(firm.autoSendEligible).toBe(false);
    expect(firm.source).toBe('fallback');
  });

  it('allows LLM auto-send only when the master switch, mode, and risk gate allow it', () => {
    const manual = decideResponse({
      inboundText: 'tell me more',
      faqs: FAQS,
      preferences: { approvalMode: 'manual', moderationLevel: 'medium', agentMode: 'help_respond' },
    });
    const auto = decideResponse({
      inboundText: 'tell me more',
      faqs: FAQS,
      preferences: { approvalMode: 'auto_eligible', moderationLevel: 'medium', agentMode: 'help_respond' },
    });
    const booking = decideResponse({
      inboundText: 'can I book tomorrow?',
      faqs: [],
      preferences: { approvalMode: 'auto_eligible', moderationLevel: 'medium', agentMode: 'talk_for_me' },
    });

    expect(manual.autoSendEligible).toBe(false);
    expect(auto.autoSendEligible).toBe(true);
    expect(booking.autoSendEligible).toBe(false);
    expect(llmReplyPassesAutoSendSafety('I can confirm you are booked.')).toBe(false);
    expect(llmReplyPassesAutoSendSafety('Sure, I can share a little more about that.')).toBe(true);
  });
});
