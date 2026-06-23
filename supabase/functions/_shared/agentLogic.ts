// Agent decision logic — pure, runtime-agnostic, dependency-free.
//
// This is the heart of the message loop: a free keyword/FAQ pre-filter that
// answers most messages without an LLM, plus light intent classification and a
// moderation screen. It deliberately imports nothing (no Deno, Supabase, or
// React Native) so the Supabase Edge Function, vitest, and any future runtime
// can all share the exact same behavior.

export interface FaqEntry {
  id?: string;
  trigger: string;
  reply: string;
  enabled?: boolean;
}

export interface FaqMatch {
  faq: FaqEntry;
  confidence: number; // 0..1
}

export type MessageIntent =
  | 'booking'
  | 'cancel'
  | 'reschedule'
  | 'pricing'
  | 'availability'
  | 'greeting'
  | 'other';

export type ResponseSource = 'faq' | 'llm' | 'fallback';

export interface AgentPreferences {
  approvalMode: 'manual' | 'auto_eligible';
  moderationLevel: 'low' | 'medium' | 'strict';
}

export interface AgentDecision {
  intent: MessageIntent;
  /** 'faq' => draftText is set now; 'llm' => caller must run the model. */
  source: ResponseSource;
  draftText: string | null;
  confidence: number;
  needsLlm: boolean;
  /** Moderation flagged the inbound text; never auto-send when true. */
  flaggedForReview: boolean;
  /** Final gate: safe to deliver without human approval. */
  autoSendEligible: boolean;
}

export interface AgentBudgetCaps {
  dailyCents?: number | null;
  monthlyCents?: number | null;
  threadCents?: number | null;
}

export interface AgentBudgetSpend {
  dailyCents: number;
  monthlyCents: number;
  threadCents: number;
}

export type AgentCapKind = 'daily' | 'monthly' | 'thread';

/** Deterministic holding reply used when no FAQ matches and the LLM is unavailable. */
export const FALLBACK_REPLY =
  "Thanks for reaching out! I've passed this along and you'll hear back shortly.";

/** Minimum FAQ confidence to treat a match as an answer (rather than fall through to the LLM). */
export const FAQ_AUTO_THRESHOLD = 0.62;

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'am', 'was', 'were', 'be',
  'been', 'do', 'does', 'did', 'i', 'you', 'your', 'yours', 'we', 'they', 'it',
  'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'me', 'my', 'mine',
  'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'please',
  'hi', 'hey', 'hello', 'so', 'that', 'this', 'have', 'has', 'had', 'get', 'got',
  'about', 'any', 'some', 'just', 'there', 'here', 'what', 'whats', 'how', 'when',
  'where', 'who', 'which', 'thanks', 'thank',
]);

// Inbound content that should never receive an automated reply. This is a
// conservative safety net (it forces human review), not a full moderation
// system. 'strict' adds a wider net than 'low'/'medium'.
const ALWAYS_FLAG = ['under 18', 'underage', 'minor', 'illegal'];
const STRICT_EXTRA = ['cash only', 'discreet only', 'no protection', 'bareback'];

export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Best enabled FAQ match for the inbound text, or null when nothing overlaps. */
export function matchFaq(text: string, faqs: FaqEntry[]): FaqMatch | null {
  const msgTokens = new Set(tokenize(text));
  const normMsg = normalizeText(text);
  let best: FaqMatch | null = null;

  for (const faq of faqs) {
    if (faq.enabled === false) continue;
    const triggerTokens = tokenize(faq.trigger);
    if (triggerTokens.length === 0) continue;

    let hit = 0;
    for (const t of triggerTokens) if (msgTokens.has(t)) hit++;
    let confidence = hit / triggerTokens.length;

    // Phrase bonus: the whole normalized trigger appears verbatim in the message.
    const normTrigger = normalizeText(faq.trigger);
    if (normTrigger && normMsg.includes(normTrigger)) {
      confidence = Math.max(confidence, 0.95);
    }

    if (confidence > 0 && (!best || confidence > best.confidence)) {
      best = { faq, confidence: round2(confidence) };
    }
  }

  return best;
}

const INTENT_KEYWORDS: Array<{ intent: MessageIntent; words: string[] }> = [
  { intent: 'cancel', words: ['cancel', 'cancelled', 'cancelling', 'call off'] },
  { intent: 'reschedule', words: ['reschedule', 'rebook', 'move', 'push back', 'different time', 'change my'] },
  { intent: 'pricing', words: ['price', 'pricing', 'cost', 'rate', 'rates', 'how much', 'fee', 'charge', '$'] },
  { intent: 'booking', words: ['book', 'booking', 'appointment', 'schedule', 'reserve', 'slot', 'session'] },
  { intent: 'availability', words: ['available', 'availability', 'free', 'open', 'today', 'tonight', 'tomorrow', 'this week'] },
  { intent: 'greeting', words: ['hi', 'hey', 'hello', 'good morning', 'good evening'] },
];

export function classifyIntent(text: string): MessageIntent {
  const t = ` ${normalizeText(text)} `;
  const raw = (text || '').toLowerCase();
  for (const { intent, words } of INTENT_KEYWORDS) {
    for (const w of words) {
      if (w === '$' ? raw.includes('$') : t.includes(` ${w} `) || t.includes(w)) {
        return intent;
      }
    }
  }
  return 'other';
}

/** Returns true when the inbound text must be held for human review. */
export function screenContent(text: string, level: AgentPreferences['moderationLevel']): boolean {
  const t = normalizeText(text);
  const list = level === 'strict' ? [...ALWAYS_FLAG, ...STRICT_EXTRA] : ALWAYS_FLAG;
  return list.some((term) => t.includes(normalizeText(term)));
}

/**
 * Decide how to respond to one inbound message.
 *
 * Policy: a confident FAQ match can auto-send when the provider opted into
 * `auto_eligible` and the message passed moderation. Anything else (LLM-drafted
 * or fallback) always routes to the approval queue in v1.
 */
function positiveCap(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function exceededAgentCaps(
  caps: AgentBudgetCaps,
  spend: AgentBudgetSpend,
): AgentCapKind[] {
  const exceeded: AgentCapKind[] = [];
  const daily = positiveCap(caps.dailyCents);
  const monthly = positiveCap(caps.monthlyCents);
  const thread = positiveCap(caps.threadCents);

  if (daily !== null && spend.dailyCents >= daily) exceeded.push('daily');
  if (monthly !== null && spend.monthlyCents >= monthly) exceeded.push('monthly');
  if (thread !== null && spend.threadCents >= thread) exceeded.push('thread');

  return exceeded;
}

export function decideResponse(params: {
  inboundText: string;
  faqs: FaqEntry[];
  preferences: AgentPreferences;
}): AgentDecision {
  const { inboundText, faqs, preferences } = params;
  const intent = classifyIntent(inboundText);
  const flaggedForReview = screenContent(inboundText, preferences.moderationLevel);
  const match = matchFaq(inboundText, faqs);

  if (match && match.confidence >= FAQ_AUTO_THRESHOLD) {
    return {
      intent,
      source: 'faq',
      draftText: match.faq.reply,
      confidence: match.confidence,
      needsLlm: false,
      flaggedForReview,
      autoSendEligible: !flaggedForReview && preferences.approvalMode === 'auto_eligible',
    };
  }

  // No confident FAQ → needs the model (or a deterministic fallback if the model
  // is unavailable). LLM/fallback drafts always require human approval in v1.
  return {
    intent,
    source: 'llm',
    draftText: null,
    confidence: match ? match.confidence : 0,
    needsLlm: true,
    flaggedForReview,
    autoSendEligible: false,
  };
}
