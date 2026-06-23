import { describe, expect, it } from 'vitest';
import {
  classifyIntent,
  decideResponse,
  exceededAgentCaps,
  matchFaq,
  normalizeText,
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

  it('skips disabled FAQs', () => {
    const m = matchFaq('where are you located', FAQS);
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

  it('keeps FAQ answers in the approval queue under manual mode', () => {
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
});
