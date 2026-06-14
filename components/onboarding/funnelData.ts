// Conversion onboarding funnel — structured source of truth.
//
// This module is intentionally pure data + pure functions (no React, no IO) so
// it can be shared by:
//   - the hi-fi review route `app/mockups/conversion-onboarding.tsx`, and
//   - the production `app/(onboarding)/onboarding.tsx` + `pricing.tsx` once the
//     mockup direction is approved.
//
// Keeping copy, answer options, analytics keys, the opportunity calculation, and
// the paywall terms here means the mockup and the eventual real flow cannot
// drift. Positioning rule: this is a message-assistant tool, never a marketplace
// — no public booking, client checkout, or service payment language anywhere.

import type { SetupPayload } from '@/utils/setup';

export type ScreenKind =
  | 'intro'
  | 'single'
  | 'multi'
  | 'currency'
  | 'result'
  | 'trust'
  | 'reminder'
  | 'paywall'
  | 'handoff'
  | 'dashboard';

export type DiagnosticOption = {
  label: string;
  value: string;
  /** Highlighted as the calm, launch-safe default. */
  recommended?: boolean;
  /** For the currency question, the answer value expressed in cents. */
  cents?: number;
};

export type FunnelScreen = {
  id: string;
  /** 1-based position used for the progress indicator (intro → paywall). */
  step: number;
  eyebrow: string;
  title: string;
  body: string;
  /** Analytics event fired when the screen is answered/viewed. */
  event: string;
  kind: ScreenKind;
  /** CTA label for the primary action on the screen. */
  cta: string;
  /** Diagnostic answer key this screen writes (question screens only). */
  answerKey?: AnswerKey;
  options?: DiagnosticOption[];
};

export type AnswerKey =
  | 'profile'
  | 'channels'
  | 'volume'
  | 'replySpeed'
  | 'clientValueCents'
  | 'faqs'
  | 'approvalMode';

export type ApprovalChoice = 'draft_all' | 'safe_faq_auto' | 'routine_auto';

export type DiagnosticAnswers = {
  profile: string | null;
  channels: string[];
  volume: string | null;
  replySpeed: string | null;
  clientValueCents: number | null;
  faqs: string[];
  approvalMode: ApprovalChoice | null;
};

export type DiagnosticResult = {
  providerCategory: string;
  channels: string[];
  /** Up to two recommended channels to connect first. */
  recommendedChannels: string[];
  dailyVolume: string;
  replySpeed: string;
  clientValueCents: number;
  faqCategories: string[];
  approvalMode: ApprovalChoice;
  /** Conservative protected-opportunity estimate, in cents per month. */
  estimatedMonthlyOpportunityCents: number;
  /** Requests assumed to go cold each week (drives the estimate). */
  coldRequestsPerWeek: number;
};

// ---------------------------------------------------------------------------
// Analytics events — instrument before any paid traffic.
// ---------------------------------------------------------------------------

export const FUNNEL_EVENTS = {
  onboardingStarted: 'onboarding_started',
  diagnosticCompleted: 'diagnostic_completed',
  trialPrimeFreeFirst: 'trial_prime_viewed.free_first',
  trialPrimeReminder: 'trial_prime_viewed.reminder',
  paywallViewed: 'paywall_viewed',
  trialStarted: 'trial_started',
  paywallDismissedOrBlocked: 'paywall_dismissed_or_blocked',
  setupStarted: 'setup_started',
  setupCompleted: 'setup_completed',
} as const;

export const diagnosticAnsweredEvent = (key: string) => `diagnostic_answered.${key}`;

// ---------------------------------------------------------------------------
// Funnel screens (mobile spine). intro → 7 questions → result → 2 priming →
// paywall → handoff → dashboard. The same list drives the interactive
// prototype, the spec gallery, and the copy/event matrix.
// ---------------------------------------------------------------------------

/** Steps shown on the progress bar (intro through paywall). */
export const PROGRESS_STEPS = 12;

export const FUNNEL_SCREENS: FunnelScreen[] = [
  {
    id: 'intro',
    step: 1,
    eyebrow: 'Start',
    title: 'Make missed messages measurable',
    body: 'A two-minute checkup estimates how many requests, hours, and likely bookings slip through slow replies.',
    event: FUNNEL_EVENTS.onboardingStarted,
    kind: 'intro',
    cta: 'Start 2-minute checkup',
  },
  {
    id: 'profile',
    step: 2,
    eyebrow: 'Profile',
    title: 'What kind of provider are you?',
    body: 'This tunes language and setup defaults. It never creates a public marketplace listing.',
    event: diagnosticAnsweredEvent('profile'),
    kind: 'single',
    cta: 'Continue',
    answerKey: 'profile',
    options: [
      { label: 'Independent wellness provider', value: 'independent_wellness' },
      { label: 'Beauty or personal care studio', value: 'beauty_studio' },
      { label: 'Companion or nightlife-adjacent service', value: 'companion_nightlife' },
      { label: 'Other appointment-based provider', value: 'other' },
    ],
  },
  {
    id: 'channels',
    step: 3,
    eyebrow: 'Channels',
    title: 'Where do clients message you now?',
    body: 'Pick every channel where reply speed affects trust. Clients stay on the channels they already use.',
    event: diagnosticAnsweredEvent('channels'),
    kind: 'multi',
    cta: 'Continue',
    answerKey: 'channels',
    options: [
      { label: 'WhatsApp', value: 'whatsapp', recommended: true },
      { label: 'SMS / Voice', value: 'sms_voice' },
      { label: 'Instagram DM', value: 'instagram' },
      { label: 'Telegram', value: 'telegram', recommended: true },
      { label: 'Email', value: 'email' },
      { label: 'Website chat', value: 'webchat' },
    ],
  },
  {
    id: 'volume',
    step: 4,
    eyebrow: 'Volume',
    title: 'How many inbound messages arrive daily?',
    body: 'A range is enough. This estimates your response load and missed-opportunity risk.',
    event: diagnosticAnsweredEvent('volume'),
    kind: 'single',
    cta: 'Continue',
    answerKey: 'volume',
    options: [
      { label: '1–5 messages', value: '1_5' },
      { label: '6–15 messages', value: '6_15' },
      { label: '16–30 messages', value: '16_30' },
      { label: '30+ messages', value: '30_plus' },
    ],
  },
  {
    id: 'speed',
    step: 5,
    eyebrow: 'Speed',
    title: 'How fast do you usually reply?',
    body: 'This is the conversion lever. Faster answers reduce drop-off before clients look elsewhere.',
    event: diagnosticAnsweredEvent('reply_speed'),
    kind: 'single',
    cta: 'Continue',
    answerKey: 'replySpeed',
    options: [
      { label: 'Under 10 minutes', value: 'under_10m' },
      { label: 'Within an hour', value: 'within_hour' },
      { label: 'A few hours later', value: 'few_hours' },
      { label: 'Often the next day', value: 'next_day' },
    ],
  },
  {
    id: 'value',
    step: 6,
    eyebrow: 'Value',
    title: 'What is one converted client worth?',
    body: 'Used only to show a conservative business case for faster replies. Not a revenue promise.',
    event: diagnosticAnsweredEvent('client_value'),
    kind: 'currency',
    cta: 'Continue',
    answerKey: 'clientValueCents',
    options: [
      { label: '$120', value: '120', cents: 12000 },
      { label: '$180', value: '180', cents: 18000 },
      { label: '$250', value: '250', cents: 25000 },
      { label: '$400', value: '400', cents: 40000 },
    ],
  },
  {
    id: 'faq',
    step: 7,
    eyebrow: 'FAQ',
    title: 'Which questions repeat the most?',
    body: 'These become your first FAQ suggestions after the trial, so setup already feels personalized.',
    event: diagnosticAnsweredEvent('faqs'),
    kind: 'multi',
    cta: 'Continue',
    answerKey: 'faqs',
    options: [
      { label: 'Pricing or packages', value: 'pricing', recommended: true },
      { label: 'Availability or location', value: 'availability', recommended: true },
      { label: 'What to expect', value: 'expectations' },
      { label: 'Boundaries and policies', value: 'boundaries', recommended: true },
    ],
  },
  {
    id: 'control',
    step: 8,
    eyebrow: 'Control',
    title: 'How cautious should the assistant be?',
    body: 'You stay in control. Approval mode should feel like a safeguard, not friction.',
    event: diagnosticAnsweredEvent('approval_mode'),
    kind: 'single',
    cta: 'Continue',
    answerKey: 'approvalMode',
    options: [
      { label: 'Draft everything for my approval', value: 'draft_all' },
      { label: 'Auto-answer safe FAQs, hold the rest', value: 'safe_faq_auto', recommended: true },
      { label: 'Auto-answer most routine messages', value: 'routine_auto' },
    ],
  },
  {
    id: 'result',
    step: 9,
    eyebrow: 'Result',
    title: 'Your message assistant plan is ready',
    body: 'Based on your answers, Nitime starts as a controlled inbox assistant — not a generic bot.',
    event: FUNNEL_EVENTS.diagnosticCompleted,
    kind: 'result',
    cta: 'See trial options',
  },
  {
    id: 'trust',
    step: 10,
    eyebrow: 'Trust',
    title: 'Try the assistant free first',
    body: 'See the inbox, draft approvals, and channel setup before deciding it belongs in your workflow.',
    event: FUNNEL_EVENTS.trialPrimeFreeFirst,
    kind: 'trust',
    cta: 'Continue',
  },
  {
    id: 'reminder',
    step: 11,
    eyebrow: 'Renewal',
    title: 'We remind you before renewal',
    body: 'The trial is transparent. We send a reminder before any charge so nothing is a surprise.',
    event: FUNNEL_EVENTS.trialPrimeReminder,
    kind: 'reminder',
    cta: 'View trial',
  },
  {
    id: 'paywall',
    step: 12,
    eyebrow: 'Paywall',
    title: 'Start your 7-day free trial',
    body: 'Annual first, monthly secondary, and every subscription term visible up front.',
    event: FUNNEL_EVENTS.paywallViewed,
    kind: 'paywall',
    cta: 'Start free trial',
  },
  {
    id: 'handoff',
    step: 13,
    eyebrow: 'Setup',
    title: 'Now configure your assistant',
    body: 'Your checkup answers are imported. You approve every rule before anything goes live.',
    event: FUNNEL_EVENTS.setupStarted,
    kind: 'handoff',
    cta: 'Open setup chat',
  },
  {
    id: 'dashboard',
    step: 14,
    eyebrow: 'Arrival',
    title: 'Your inbox assistant is standing by',
    body: 'Confirm immediate value: agent status, pending approvals, and channel setup progress.',
    event: FUNNEL_EVENTS.setupCompleted,
    kind: 'dashboard',
    cta: 'Review pending replies',
  },
];

// ---------------------------------------------------------------------------
// Plans + transparent paywall terms.
// A hard paywall gates features, never hides material subscription terms.
// All six required disclosures live here so the real paywall and the mockup
// render identical copy.
// ---------------------------------------------------------------------------

export type PlanId = 'annual' | 'monthly';

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  /** Equivalent monthly figure for honest comparison, or null. */
  perMonth: string | null;
  billingPeriod: string;
  trial: string | null;
  badge?: string;
  recommended?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: 'annual',
    name: 'Annual',
    price: '$299 / year',
    perMonth: '$24.92 / mo billed yearly',
    billingPeriod: 'Billed once per year',
    trial: '7-day free trial',
    badge: 'Best value',
    recommended: true,
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$39 / month',
    perMonth: null,
    billingPeriod: 'Billed every month',
    trial: null,
  },
];

export const TRIAL_INCLUDED_FEATURES = [
  'Unified inbox with approval queue',
  'Connect Google Voice, WhatsApp, Telegram, or web chat',
  'FAQ training for pricing, availability, and boundaries',
  'Provider-controlled approval and moderation',
];

/** The six disclosures the paywall must always show. */
export const PAYWALL_TERMS = {
  trialLength: '7-day free trial',
  renewalPrice: 'Renews at $299/year after the trial',
  billingPeriod: 'Annual billing (monthly plan available)',
  paymentDuringTrial: 'Trial requires a payment method; you are not charged until day 7',
  cancellation: 'Cancel anytime in your store subscription settings before the trial ends',
  restorePurchase: 'Restore purchase',
  includedFeatures: TRIAL_INCLUDED_FEATURES,
} as const;

/** Internal-only escape hatch; gated behind an env flag in the real flow. */
export const DEMO_UNLOCK_LABEL = 'Start demo (internal only)';

// ---------------------------------------------------------------------------
// Calculations + recommendations.
// ---------------------------------------------------------------------------

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  sms_voice: 'SMS / Voice',
  instagram: 'Instagram DM',
  telegram: 'Telegram',
  email: 'Email',
  webchat: 'Website chat',
};

const VOLUME_LABELS: Record<string, string> = {
  '1_5': '1–5 daily',
  '6_15': '6–15 daily',
  '16_30': '16–30 daily',
  '30_plus': '30+ daily',
};

const SPEED_LABELS: Record<string, string> = {
  under_10m: 'Under 10 minutes',
  within_hour: 'Within an hour',
  few_hours: 'A few hours later',
  next_day: 'Often the next day',
};

const FAQ_LABELS: Record<string, string> = {
  pricing: 'Pricing',
  availability: 'Availability',
  expectations: 'What to expect',
  boundaries: 'Boundaries',
};

// Conservative cold-requests-per-week, keyed by reply speed. Calibrated so the
// documented example (a few hours later + $180 value) lands on $1,440/month:
// $180 × 2 cold/week × 4 weeks. Faster repliers lose fewer; slower lose more.
const COLD_PER_WEEK_BY_SPEED: Record<string, number> = {
  under_10m: 0.5,
  within_hour: 1,
  few_hours: 2,
  next_day: 3,
};

// Connect-first priority: zero/low-setup and high-intent channels first.
const CHANNEL_PRIORITY = ['whatsapp', 'telegram', 'webchat', 'instagram', 'sms_voice', 'email'];

export const channelLabel = (value: string) => CHANNEL_LABELS[value] ?? value;
export const volumeLabel = (value: string | null) => (value ? VOLUME_LABELS[value] ?? value : '—');
export const speedLabel = (value: string | null) => (value ? SPEED_LABELS[value] ?? value : '—');
export const faqLabel = (value: string) => FAQ_LABELS[value] ?? value;

export const PROFILE_LABELS: Record<string, string> = {
  independent_wellness: 'Independent wellness provider',
  beauty_studio: 'Beauty or personal care studio',
  companion_nightlife: 'Companion or nightlife-adjacent service',
  other: 'Appointment-based provider',
};

export function recommendedChannels(channels: string[]): string[] {
  const ranked = [...channels].sort(
    (a, b) => CHANNEL_PRIORITY.indexOf(a) - CHANNEL_PRIORITY.indexOf(b),
  );
  // Fall back to the zero-setup web chat channel if the provider selected none.
  return (ranked.length ? ranked : ['webchat']).slice(0, 2);
}

export function formatCurrencyCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

export function computeResult(answers: DiagnosticAnswers): DiagnosticResult {
  const clientValueCents = answers.clientValueCents ?? 18000;
  const coldRequestsPerWeek = COLD_PER_WEEK_BY_SPEED[answers.replySpeed ?? 'few_hours'] ?? 2;
  const estimatedMonthlyOpportunityCents = Math.round(clientValueCents * coldRequestsPerWeek * 4);

  return {
    providerCategory: answers.profile ? PROFILE_LABELS[answers.profile] ?? 'Provider' : 'Provider',
    channels: answers.channels,
    recommendedChannels: recommendedChannels(answers.channels),
    dailyVolume: volumeLabel(answers.volume),
    replySpeed: speedLabel(answers.replySpeed),
    clientValueCents,
    faqCategories: answers.faqs,
    approvalMode: answers.approvalMode ?? 'safe_faq_auto',
    estimatedMonthlyOpportunityCents,
    coldRequestsPerWeek,
  };
}

// ---------------------------------------------------------------------------
// Setup-chat handoff: map accepted diagnostic answers onto a SetupPayload patch
// so setup starts pre-filled and feels intelligent.
// ---------------------------------------------------------------------------

const APPROVAL_TO_PAYLOAD: Record<ApprovalChoice, SetupPayload['approvalMode']> = {
  draft_all: 'manual',
  safe_faq_auto: 'auto_eligible',
  routine_auto: 'auto_eligible',
};

export function toSetupPayloadPatch(result: DiagnosticResult): Partial<SetupPayload> {
  return {
    businessCategory: result.providerCategory,
    messageChannels: result.recommendedChannels.map(channelLabel),
    commonQuestions: result.faqCategories.map(faqLabel),
    approvalMode: APPROVAL_TO_PAYLOAD[result.approvalMode],
    // Companion/nightlife-adjacent work leans on stricter moderation by default.
    moderationLevel: result.providerCategory.toLowerCase().includes('companion') ? 'strict' : 'medium',
  };
}

export const SAMPLE_ANSWERS: DiagnosticAnswers = {
  profile: 'independent_wellness',
  channels: ['whatsapp', 'telegram'],
  volume: '6_15',
  replySpeed: 'few_hours',
  clientValueCents: 18000,
  faqs: ['pricing', 'availability', 'boundaries'],
  approvalMode: 'safe_faq_auto',
};
