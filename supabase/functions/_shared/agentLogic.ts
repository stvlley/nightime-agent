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
export type AgentMode = 'keep_up' | 'help_respond' | 'talk_for_me';
export type ClassifierReason =
  | 'faq_hit'
  | 'routine_miss'
  | 'conversation_requested'
  | 'sensitive'
  | 'firm_commitment'
  | 'unknown';

export interface AgentModeConfig {
  mode: AgentMode;
  model: string;
  maxTokens: number;
  dailyCallCap: number;
  monthlyCallCap: number;
  threadCallCap: number;
  allowLlmAutoSend: boolean;
}

export interface AgentPreferences {
  approvalMode: 'manual' | 'auto_eligible';
  moderationLevel: 'low' | 'medium' | 'strict';
  agentMode?: AgentMode | null;
}

export interface AgentDecision {
  intent: MessageIntent;
  reason: ClassifierReason;
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

export interface AgentCallCaps {
  dailyCalls?: number | null;
  monthlyCalls?: number | null;
  threadCalls?: number | null;
}

export interface AgentCallUsage {
  dailyCalls: number;
  monthlyCalls: number;
  threadCalls: number;
}

/** Deterministic holding reply used when no FAQ matches and the LLM is unavailable. */
export const FALLBACK_REPLY =
  "Thanks for reaching out! I've passed this along and you'll hear back shortly.";

/** Minimum FAQ confidence to treat a match as an answer (rather than fall through to the LLM). */
export const FAQ_AUTO_THRESHOLD = 0.62;
export const AGENT_MODE_DEFAULTS: Record<AgentMode, AgentModeConfig> = {
  keep_up: {
    mode: 'keep_up',
    model: 'openrouter/free',
    maxTokens: 120,
    dailyCallCap: 40,
    monthlyCallCap: 500,
    threadCallCap: 2,
    allowLlmAutoSend: true,
  },
  help_respond: {
    mode: 'help_respond',
    model: 'google/gemini-2.5-flash-lite',
    maxTokens: 180,
    dailyCallCap: 150,
    monthlyCallCap: 2000,
    threadCallCap: 4,
    allowLlmAutoSend: true,
  },
  talk_for_me: {
    mode: 'talk_for_me',
    model: 'openai/gpt-4.1-mini',
    maxTokens: 220,
    // Full automation has no response cap — 0 disables the daily/monthly/thread
    // call limits (positiveCap treats any non-positive value as "no cap").
    // Provider cost caps (ai_*_cap_cents) still apply if the provider sets them.
    dailyCallCap: 0,
    monthlyCallCap: 0,
    threadCallCap: 0,
    allowLlmAutoSend: true,
  },
};

const MODEL_ENV_BY_MODE: Record<AgentMode, string> = {
  keep_up: 'AGENT_MODEL_KEEP_UP',
  help_respond: 'AGENT_MODEL_HELP_RESPOND',
  talk_for_me: 'AGENT_MODEL_TALK_FOR_ME',
};

const INTENT_MATCH_CONFIDENCE = 0.72;
const EXACT_PHRASE_CONFIDENCE = 0.95;
const ALIAS_MATCH_CONFIDENCE = 0.78;
const TYPO_MATCH_CONFIDENCE = 0.68;

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

const INTENT_ALIASES: Record<Exclude<MessageIntent, 'other'>, string[]> = {
  cancel: ['cancel', 'cancelled', 'cancelling', 'call off'],
  reschedule: ['reschedule', 'rebook', 'move', 'push back', 'different time', 'change my'],
  pricing: ['price', 'pricing', 'cost', 'rate', 'rates', 'how much', 'fee', 'charge'],
  booking: ['book', 'booking', 'appointment', 'schedule', 'reserve', 'slot', 'session', 'come over', 'come in', 'come by', 'come on over', 'stop by', 'swing by', 'drop by', 'come see'],
  availability: ['available', 'availability', 'free', 'open', 'today', 'tonight', 'tomorrow', 'this week'],
  greeting: ['hi', 'hey', 'hello', 'good morning', 'good evening'],
};

function hasNormalizedPhrase(text: string, phrase: string): boolean {
  const normText = ` ${normalizeText(text)} `;
  const normPhrase = normalizeText(phrase);
  return !!normPhrase && normText.includes(` ${normPhrase} `);
}

function containsIntentAlias(text: string, intent: MessageIntent): boolean {
  if (intent === 'other') return false;
  return INTENT_ALIASES[intent].some((alias) => hasNormalizedPhrase(text, alias));
}

export function normalizeAgentMode(mode: string | null | undefined): AgentMode {
  return mode === 'help_respond' || mode === 'talk_for_me' || mode === 'keep_up'
    ? mode
    : 'keep_up';
}

export function resolveAgentModeConfig(
  mode: string | null | undefined,
  env: Record<string, string | undefined> = {},
): AgentModeConfig {
  const normalized = normalizeAgentMode(mode);
  const defaults = AGENT_MODE_DEFAULTS[normalized];
  return {
    ...defaults,
    model: env[MODEL_ENV_BY_MODE[normalized]] || env.AGENT_MODEL || defaults.model,
  };
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function hasShortTypoMatch(messageTokens: Set<string>, triggerTokens: string[]): boolean {
  if (triggerTokens.length === 0 || triggerTokens.length > 3 || messageTokens.size > 6) return false;

  for (const trigger of triggerTokens) {
    if (trigger.length < 3 || trigger.length > 10) return false;
    const maxDistance = trigger.length <= 4 ? 1 : 2;
    let matched = false;
    for (const token of messageTokens) {
      if (Math.abs(token.length - trigger.length) > maxDistance) continue;
      if (editDistance(token, trigger) <= maxDistance) {
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }
  return true;
}

/** Best enabled FAQ match for the inbound text, or null when nothing overlaps. */
export function matchFaq(text: string, faqs: FaqEntry[]): FaqMatch | null {
  const msgTokens = new Set(tokenize(text));
  const allMsgTokens = new Set(normalizeText(text).split(' ').filter(Boolean));
  const msgIntent = classifyIntent(text);
  let best: FaqMatch | null = null;

  for (const faq of faqs) {
    if (faq.enabled === false) continue;
    const normTrigger = normalizeText(faq.trigger);
    if (!normTrigger) continue;

    const triggerTokens = tokenize(faq.trigger);
    const allTriggerTokens = normTrigger.split(' ').filter(Boolean);
    const triggerIntent = classifyIntent(faq.trigger);
    let confidence = 0;

    // Phrase bonus: the whole normalized trigger appears verbatim in the message.
    if (hasNormalizedPhrase(text, normTrigger)) {
      confidence = Math.max(confidence, EXACT_PHRASE_CONFIDENCE);
    }

    if (triggerTokens.length > 0) {
      let hit = 0;
      for (const t of triggerTokens) if (msgTokens.has(t)) hit++;
      confidence = Math.max(confidence, hit / triggerTokens.length);
    }

    if (
      triggerIntent !== 'other' &&
      triggerIntent === msgIntent &&
      containsIntentAlias(text, triggerIntent) &&
      containsIntentAlias(faq.trigger, triggerIntent)
    ) {
      confidence = Math.max(confidence, ALIAS_MATCH_CONFIDENCE);
    }

    if (triggerIntent !== 'other' && triggerIntent === msgIntent) {
      confidence = Math.max(confidence, INTENT_MATCH_CONFIDENCE);
    }

    if (
      confidence < FAQ_AUTO_THRESHOLD &&
      hasShortTypoMatch(allMsgTokens, allTriggerTokens)
    ) {
      confidence = Math.max(confidence, TYPO_MATCH_CONFIDENCE);
    }

    if (confidence > 0 && (!best || confidence > best.confidence)) {
      best = { faq, confidence: round2(confidence) };
    }
  }

  return best;
}

const INTENT_KEYWORDS: Array<{ intent: MessageIntent; words: string[] }> = [
  { intent: 'cancel', words: INTENT_ALIASES.cancel },
  { intent: 'reschedule', words: INTENT_ALIASES.reschedule },
  { intent: 'pricing', words: [...INTENT_ALIASES.pricing, '$'] },
  { intent: 'booking', words: INTENT_ALIASES.booking },
  { intent: 'availability', words: INTENT_ALIASES.availability },
  { intent: 'greeting', words: INTENT_ALIASES.greeting },
];

export function classifyIntent(text: string): MessageIntent {
  const raw = (text || '').toLowerCase();
  for (const { intent, words } of INTENT_KEYWORDS) {
    for (const w of words) {
      if (w === '$' ? raw.includes('$') : hasNormalizedPhrase(text, w)) {
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

export function exceededAgentCallCaps(
  caps: AgentCallCaps,
  usage: AgentCallUsage,
): AgentCapKind[] {
  const exceeded: AgentCapKind[] = [];
  const daily = positiveCap(caps.dailyCalls);
  const monthly = positiveCap(caps.monthlyCalls);
  const thread = positiveCap(caps.threadCalls);

  if (daily !== null && usage.dailyCalls >= daily) exceeded.push('daily');
  if (monthly !== null && usage.monthlyCalls >= monthly) exceeded.push('monthly');
  if (thread !== null && usage.threadCalls >= thread) exceeded.push('thread');

  return exceeded;
}

function hasAnyPhrase(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => hasNormalizedPhrase(text, phrase));
}

const CONVERSATION_PHRASES = [
  'tell me more',
  'more info',
  'can you explain',
  'could you explain',
  'what do you mean',
  'what does that mean',
  'how does this work',
  'how does it work',
  'what do you recommend',
  'what would you recommend',
  'can you help',
  'help me decide',
  'not sure',
  'i am not sure',
];

const HARD_COMMITMENT_PHRASES = [
  'book it',
  'book me',
  'confirm',
  'confirmed',
  'reserve',
  'hold it',
  'that works for me',
  'go ahead',
  'cancel',
  'cancellation',
  'refund',
  'chargeback',
  'deposit',
  'send payment',
  'send the address',
];

const SENSITIVE_PHRASES = [
  'under 18',
  'underage',
  'minor',
  'safety',
  'unsafe',
  'illegal',
  'cash only',
  'discreet only',
  'no protection',
  'bareback',
];

export function isQuestionLike(text: string): boolean {
  const raw = (text || '').trim();
  return raw.includes('?') || /^(what|when|where|who|why|how|can|could|do|does|is|are|will|would)\b/i.test(raw);
}

export function classifyAgentReason(params: {
  inboundText: string;
  intent: MessageIntent;
  flaggedForReview: boolean;
  faqHit: boolean;
}): ClassifierReason {
  const { inboundText, intent, flaggedForReview, faqHit } = params;
  if (faqHit) return 'faq_hit';
  if (flaggedForReview || hasAnyPhrase(inboundText, SENSITIVE_PHRASES)) return 'sensitive';
  if (intent === 'cancel' || intent === 'reschedule' || hasAnyPhrase(inboundText, HARD_COMMITMENT_PHRASES)) {
    return 'firm_commitment';
  }
  if (hasAnyPhrase(inboundText, CONVERSATION_PHRASES) || (intent === 'other' && isQuestionLike(inboundText))) {
    return 'conversation_requested';
  }
  if (intent !== 'other' || isQuestionLike(inboundText)) return 'routine_miss';
  return 'unknown';
}

function modeAllowsLlm(mode: AgentMode, reason: ClassifierReason, intent: MessageIntent): boolean {
  if (reason === 'sensitive' || reason === 'firm_commitment' || reason === 'faq_hit') return false;
  if (mode === 'talk_for_me') return true;
  if (mode === 'help_respond') return reason === 'routine_miss' || reason === 'conversation_requested';
  if (reason === 'conversation_requested') return true;
  return reason === 'routine_miss' && ['greeting', 'pricing', 'availability'].includes(intent);
}

// Transactional intents always wait for a human in every mode: bookings and
// availability are handled by the deterministic booking flow, and pricing /
// cancel / reschedule need provider judgement before anything is promised.
const HIGH_STAKES_INTENTS: MessageIntent[] = ['booking', 'availability', 'pricing', 'cancel', 'reschedule'];

function llmAutoSendRiskAllowed(
  mode: AgentMode,
  reason: ClassifierReason,
  intent: MessageIntent,
  inboundText: string,
): boolean {
  if (HIGH_STAKES_INTENTS.includes(intent)) return false;

  // Talk-for-me = full automation: any remaining mode-allowed reply can
  // auto-send. sensitive / firm_commitment never reach here (modeAllowsLlm
  // routes them to a held fallback), and the draft still clears moderation and
  // the output-safety guard before it goes out.
  if (mode === 'talk_for_me') return true;

  // keep_up / help_respond keep the conservative gate: only greetings and
  // explicit "tell me more"-style conversation openers auto-send.
  if (reason === 'routine_miss') return intent === 'greeting';
  if (reason !== 'conversation_requested') return false;
  return hasAnyPhrase(inboundText, CONVERSATION_PHRASES);
}

// Phrasings that assert a commitment the agent may not make on its own — the
// booking engine owns real confirmations, times, and prices. Tuned to catch
// declarations ("you're booked", "confirmed for 3pm", "costs $40") without
// tripping on natural offers or questions ("what can I get you booked?").
const OVER_PROMISE_PATTERNS: RegExp[] = [
  /\b(?:you(?:'?re| are)|i(?:'?ve| have|'?m)|we(?:'?ve| have)|it'?s|that'?s)\s+(?:\w+\s+){0,2}(?:booked|confirmed|cancelled|canceled|refunded)\b/i,
  /\b(?:booked|confirmed|cancelled|canceled|refunded)\s+(?:for|at|on)\s+(?:\d|mon|tue|wed|thu|fri|sat|sun|today|tomorrow|tonight|next|this)/i,
  /\bavailable at\b/i,
  /\bopen at\b/i,
  /\bcosts?\s+\$?\d+/i,
];

export function llmReplyPassesAutoSendSafety(text: string): boolean {
  if (!text || hasAnyPhrase(text, [...SENSITIVE_PHRASES, ...HARD_COMMITMENT_PHRASES])) return false;
  return !OVER_PROMISE_PATTERNS.some((re) => re.test(text));
}

/**
 * Decide how to respond to one inbound message.
 *
 * Policy: a confident FAQ match can auto-send when the provider opted into
 * `auto_eligible` and the message passed moderation. LLM drafts auto-send only
 * for low-risk, mode-allowed misses — `talk_for_me` (full automation) sends any
 * clean non-transactional reply, while `keep_up`/`help_respond` stay
 * conservative (greetings + explicit conversation openers). Transactional,
 * sensitive, firm-commitment, and fallback replies always route to approval.
 */
export function decideResponse(params: {
  inboundText: string;
  faqs: FaqEntry[];
  preferences: AgentPreferences;
}): AgentDecision {
  const { inboundText, faqs, preferences } = params;
  const intent = classifyIntent(inboundText);
  const mode = normalizeAgentMode(preferences.agentMode);
  const modeConfig = AGENT_MODE_DEFAULTS[mode];
  const flaggedForReview = screenContent(inboundText, preferences.moderationLevel);
  const match = matchFaq(inboundText, faqs);

  if (match && match.confidence >= FAQ_AUTO_THRESHOLD) {
    return {
      intent,
      reason: 'faq_hit',
      source: 'faq',
      draftText: match.faq.reply,
      confidence: match.confidence,
      needsLlm: false,
      flaggedForReview,
      autoSendEligible: !flaggedForReview && preferences.approvalMode === 'auto_eligible',
    };
  }

  const reason = classifyAgentReason({
    inboundText,
    intent,
    flaggedForReview,
    faqHit: false,
  });

  if (!modeAllowsLlm(mode, reason, intent)) {
    return {
      intent,
      reason,
      source: 'fallback',
      draftText: FALLBACK_REPLY,
      confidence: match ? match.confidence : 0,
      needsLlm: false,
      flaggedForReview,
      autoSendEligible: false,
    };
  }

  // No confident FAQ → use the model only for mode-allowed, low-risk misses.
  // LLM auto-send still goes through runtime caps, moderation, and output safety.
  return {
    intent,
    reason,
    source: 'llm',
    draftText: null,
    confidence: match ? match.confidence : 0,
    needsLlm: true,
    flaggedForReview,
    autoSendEligible:
      !flaggedForReview &&
      preferences.approvalMode === 'auto_eligible' &&
      modeConfig.allowLlmAutoSend &&
      llmAutoSendRiskAllowed(mode, reason, intent, inboundText),
  };
}
