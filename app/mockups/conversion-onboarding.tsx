// Hi-fi review route for the Phase 1.85 conversion onboarding + paywall.
//
// Two views, one source of truth (`components/onboarding/funnelData.ts`):
//   1. Interactive prototype — a single clickable device that walks the real
//      funnel with live selection state, a live opportunity estimate, and a
//      fully transparent paywall.
//   2. Screen spec — the full mobile gallery, desktop adaptations, the
//      Fresha-derived reference patterns, and the copy/event + paywall-terms
//      matrices used for product + compliance review.
//
// This route is self-contained: it does not wire into the production
// onboarding navigation. The data module is the shared seam that the real
// `app/(onboarding)/onboarding.tsx` + `pricing.tsx` will import later.

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  ArrowLeft,
  Bell,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  Globe2,
  Inbox,
  LifeBuoy,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import { colors } from '@/components/ui';
import {
  type ApprovalChoice,
  type DiagnosticAnswers,
  type DiagnosticResult,
  type FunnelScreen,
  FUNNEL_SCREENS,
  PAYWALL_TERMS,
  PLANS,
  PROFILE_LABELS,
  PROGRESS_STEPS,
  SAMPLE_ANSWERS,
  channelLabel,
  computeResult,
  faqLabel,
  formatCurrencyCents,
} from '@/components/onboarding/funnelData';

const EMPTY_ANSWERS: DiagnosticAnswers = {
  profile: null,
  channels: [],
  volume: null,
  replySpeed: null,
  clientValueCents: null,
  faqs: [],
  approvalMode: null,
};

const APPROVAL_LABELS: Record<ApprovalChoice, string> = {
  draft_all: 'Draft everything for approval',
  safe_faq_auto: 'Safe FAQs auto, sensitive cases held',
  routine_auto: 'Routine messages auto-answered',
};

export default function ConversionOnboardingMockups() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1040;
  const [view, setView] = useState<'prototype' | 'spec'>('prototype');

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={[styles.hero, isWide && styles.heroWide]}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Nitime AI · Phase 1.85</Text>
          <Text style={styles.heroTitle}>Conversion onboarding & paywall</Text>
          <Text style={styles.heroBody}>
            A long provider diagnostic that quantifies the cost of slow replies, two trust
            screens, an annual-first trial paywall with every term visible, and the setup-chat
            handoff. Positioned as a message-assistant tool — never a marketplace.
          </Text>
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: 'prototype', label: 'Interactive prototype' },
              { value: 'spec', label: 'Screen spec' },
            ]}
          />
        </View>
        <View style={styles.heroPanel}>
          <View style={styles.metricRow}>
            <Metric label="Screens" value="14" tone="primary" />
            <Metric label="Trial" value="3d" tone="success" />
          </View>
          <View style={styles.metricRow}>
            <Metric label="Default" value="Annual" tone="info" />
            <Metric label="Mode" value="Approve" tone="warning" />
          </View>
        </View>
      </View>

      {view === 'prototype' ? <PrototypeFlow /> : <SpecView />}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Interactive prototype
// ---------------------------------------------------------------------------

function PrototypeFlow() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswers>(EMPTY_ANSWERS);
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual');

  const screen = FUNNEL_SCREENS[index];
  const result = useMemo(() => computeResult(answers), [answers]);

  const setSingle = (key: keyof DiagnosticAnswers, value: string) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));
  const setCents = (cents: number) => setAnswers((prev) => ({ ...prev, clientValueCents: cents }));
  const toggleMulti = (key: 'channels' | 'faqs', value: string) =>
    setAnswers((prev) => {
      const list = prev[key];
      return {
        ...prev,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });

  const interaction = { answers, result, plan, setSingle, setCents, toggleMulti, setPlan };

  const canContinue = isAnswered(screen, answers);
  const isLast = index === FUNNEL_SCREENS.length - 1;

  const goNext = () => {
    if (isLast) {
      setIndex(0);
      setAnswers(EMPTY_ANSWERS);
      setPlan('annual');
      return;
    }
    if (canContinue) setIndex((i) => Math.min(i + 1, FUNNEL_SCREENS.length - 1));
  };
  const goBack = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <View style={[styles.prototypeWrap]}>
      <PhoneFrame
        screen={screen}
        interaction={interaction}
        footer={
          <View style={styles.footerRow}>
            {index > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={styles.backButton}
                onPress={goBack}
              >
                <ArrowLeft size={18} color={appInk} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              style={[styles.cta, !canContinue && styles.ctaDisabled, isLast && styles.ctaNeutral]}
              onPress={goNext}
              disabled={!canContinue}
            >
              {isLast ? <RotateCcw size={16} color={appInk} /> : null}
              <Text style={[styles.ctaText, isLast && styles.ctaTextNeutral]}>
                {isLast ? 'Restart prototype' : screen.cta}
              </Text>
              {!isLast ? <ChevronRight size={17} color="#ffffff" /> : null}
            </Pressable>
          </View>
        }
      />

      <View style={styles.protoAside}>
        <Text style={styles.asideHeading}>Live diagnostic state</Text>
        <Text style={styles.asideBody}>
          Tap through the device. Selections feed the same `computeResult()` the real flow will
          use; the estimate stays conservative and is labelled opportunity, not guaranteed revenue.
        </Text>
        <View style={styles.asideCard}>
          <AsideRow label="Step" value={`${screen.step} / 14 · ${screen.eyebrow}`} />
          <AsideRow label="Event" value={screen.event} mono />
          <AsideRow
            label="Profile"
            value={answers.profile ? PROFILE_LABELS[answers.profile] : 'unset'}
          />
          <AsideRow
            label="Channels"
            value={answers.channels.length ? answers.channels.map(channelLabel).join(', ') : 'none'}
          />
          <AsideRow label="Reply speed" value={result.replySpeed} />
          <AsideRow
            label="Client value"
            value={answers.clientValueCents ? formatCurrencyCents(answers.clientValueCents) : 'unset'}
          />
          <AsideRow
            label="Est. opportunity"
            value={`${formatCurrencyCents(result.estimatedMonthlyOpportunityCents)} / mo`}
            strong
          />
        </View>
        <View style={styles.asideNote}>
          <ShieldCheck size={15} color={colors.success} />
          <Text style={styles.asideNoteText}>
            No public listing, client checkout, or service payment anywhere in the flow.
          </Text>
        </View>
      </View>
    </View>
  );
}

function isAnswered(screen: FunnelScreen, answers: DiagnosticAnswers): boolean {
  switch (screen.kind) {
    case 'single':
      return screen.answerKey ? answers[screen.answerKey] != null : true;
    case 'currency':
      return answers.clientValueCents != null;
    case 'multi':
      return screen.answerKey === 'channels'
        ? answers.channels.length > 0
        : answers.faqs.length > 0;
    default:
      return true;
  }
}

type Interaction = {
  answers: DiagnosticAnswers;
  result: DiagnosticResult;
  plan: 'annual' | 'monthly';
  setSingle: (key: keyof DiagnosticAnswers, value: string) => void;
  setCents: (cents: number) => void;
  toggleMulti: (key: 'channels' | 'faqs', value: string) => void;
  setPlan: (plan: 'annual' | 'monthly') => void;
};

// ---------------------------------------------------------------------------
// Phone frame + screen body (shared by prototype and spec gallery)
// ---------------------------------------------------------------------------

function PhoneFrame({
  screen,
  interaction,
  footer,
}: {
  screen: FunnelScreen;
  interaction?: Interaction;
  footer?: React.ReactNode;
}) {
  const dark = false;
  return (
    <View style={[styles.phone, dark && styles.phoneDark]}>
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, dark && styles.darkText]}>9:41</Text>
        <View style={styles.dynamicIsland} />
      </View>

      <View style={styles.phoneHeader}>
        <Text style={[styles.brand, dark && styles.darkText]}>Nitime</Text>
        <View style={[styles.stepBadge, dark && styles.stepBadgeDark]}>
          <Text style={styles.stepBadgeText}>{screen.eyebrow}</Text>
        </View>
      </View>

      {screen.step <= PROGRESS_STEPS ? <Progress current={screen.step} /> : null}

      <View style={styles.screenIntro}>
        <Text style={[styles.phoneTitle, dark && styles.darkText]}>{screen.title}</Text>
        <Text style={[styles.phoneBody, dark && styles.darkSubtext]}>{screen.body}</Text>
      </View>

      <View style={styles.phoneContent}>
        <ScreenBody screen={screen} interaction={interaction} />
      </View>

      {footer ?? <StaticFooter screen={screen} />}
    </View>
  );
}

function StaticFooter({ screen }: { screen: FunnelScreen }) {
  const dark = screen.kind === 'paywall';
  return (
    <View style={styles.footerRow}>
      <View style={[styles.cta, dark && styles.ctaNeutral]}>
        <Text style={[styles.ctaText, dark && styles.ctaTextNeutral]}>{screen.cta}</Text>
        {!dark ? <ChevronRight size={17} color="#ffffff" /> : null}
      </View>
    </View>
  );
}

function ScreenBody({ screen, interaction }: { screen: FunnelScreen; interaction?: Interaction }) {
  const answers = interaction?.answers ?? SAMPLE_ANSWERS;
  const result = interaction?.result ?? computeResult(SAMPLE_ANSWERS);

  switch (screen.kind) {
    case 'intro':
      return (
        <View style={styles.featurePanel}>
          <View style={styles.featureWash}>
            <View style={styles.featureWashBlue} />
            <View style={styles.featureWashViolet} />
            <View style={styles.featureWashPink} />
            <Text style={styles.featureLogo}>nitime</Text>
          </View>
          <Text style={styles.featureTitle}>Most providers do not need more leads first.</Text>
          <Text style={styles.featureBody}>
            They need a faster, safer way to answer the leads already in their inbox. This checkup
            measures that gap.
          </Text>
        </View>
      );

    case 'single':
      return (
        <View style={styles.stack}>
          {screen.options?.map((opt) => (
            <Option
              key={opt.value}
              label={opt.label}
              selected={screen.answerKey ? answers[screen.answerKey] === opt.value : false}
              onPress={
                interaction && screen.answerKey
                  ? () => interaction.setSingle(screen.answerKey!, opt.value)
                  : undefined
              }
            />
          ))}
          {screen.id === 'profile' ? (
            <Notice
              icon={ShieldCheck}
              text="Message assistant only. Clients stay on your own channels."
              tone="info"
            />
          ) : null}
          {screen.id === 'speed' ? (
            <Notice icon={Clock3} text="Late replies are where warm requests turn cold." tone="warning" />
          ) : null}
          {screen.id === 'control' ? (
            <View style={styles.recommendation}>
              <ShieldCheck size={20} color={colors.accent} />
              <Text style={styles.recommendTitle}>Recommended for launch</Text>
              <Text style={styles.recommendText}>
                Auto-answer safe FAQs. Hold pricing edge cases, boundaries, and anything uncertain
                for your approval.
              </Text>
            </View>
          ) : null}
        </View>
      );

    case 'multi':
      return screen.answerKey === 'channels' ? (
        <View style={styles.stack}>
          <View style={styles.chipGrid}>
            {screen.options?.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={answers.channels.includes(opt.value)}
                onPress={interaction ? () => interaction.toggleMulti('channels', opt.value) : undefined}
              />
            ))}
          </View>
          <Notice
            icon={MessageCircle}
            text="Start with the channel where clients already ask pricing and boundaries."
            tone="primary"
          />
        </View>
      ) : (
        <View style={styles.stack}>
          {screen.options?.map((opt) => (
            <Option
              key={opt.value}
              label={opt.label}
              selected={answers.faqs.includes(opt.value)}
              onPress={interaction ? () => interaction.toggleMulti('faqs', opt.value) : undefined}
            />
          ))}
          <Notice icon={Bot} text="These categories prefill your setup-chat suggestions." tone="info" />
        </View>
      );

    case 'currency':
      return (
        <View style={styles.stack}>
          <View style={styles.chipGrid}>
            {screen.options?.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={answers.clientValueCents === opt.cents}
                onPress={interaction && opt.cents != null ? () => interaction.setCents(opt.cents!) : undefined}
              />
            ))}
          </View>
          <View style={styles.valuePanel}>
            <TrendingUp size={22} color={colors.success} />
            <Text style={styles.valueLabel}>
              If {result.coldRequestsPerWeek} request{result.coldRequestsPerWeek === 1 ? '' : 's'} go cold each week
            </Text>
            <Text style={styles.valueAmount}>
              {formatCurrencyCents(result.estimatedMonthlyOpportunityCents)} / month
            </Text>
            <Text style={styles.valueCaption}>Opportunity protected, not guaranteed revenue.</Text>
          </View>
        </View>
      );

    case 'result':
      return (
        <View style={styles.resultPanel}>
          <Sparkles size={24} color={colors.success} />
          <Text style={styles.resultEyebrow}>Recommended setup</Text>
          <Text style={styles.resultTitle}>
            {result.recommendedChannels.map(channelLabel).join(' + ') || 'Web chat'} first
          </Text>
          <Text style={styles.resultBody}>
            Answer {result.faqCategories.map(faqLabel).join(', ').toLowerCase() || 'common'} questions
            with {APPROVAL_LABELS[result.approvalMode].toLowerCase()}.
          </Text>
          <View style={styles.resultDivider} />
          <Text style={styles.resultEyebrow}>Estimated protected opportunity</Text>
          <Text style={styles.resultAmount}>
            {formatCurrencyCents(result.estimatedMonthlyOpportunityCents)} / month
          </Text>
        </View>
      );

    case 'trust':
      return (
        <View style={styles.trustPanel}>
          <Text style={styles.trustTitle}>Your 7-day trial includes</Text>
          {PAYWALL_TERMS.includedFeatures.map((feature) => (
            <Option key={feature} label={feature} selected compact />
          ))}
        </View>
      );

    case 'reminder':
      return (
        <View style={styles.stack}>
          <TimelineRow day="Day 1" label="Connect your first channel" />
          <TimelineRow day="Day 2" label="Approve a few suggested replies" />
          <TimelineRow day="Day 7" label="Reminder email before any charge" last />
          <Notice icon={ShieldCheck} text="No service payments. No marketplace booking." tone="success" />
        </View>
      );

    case 'paywall':
      return <Paywall interaction={interaction} />;

    case 'handoff':
      return (
        <View style={styles.stack}>
          <Notice
            icon={Sparkles}
            text={`Imported: ${result.recommendedChannels.map(channelLabel).join(', ')}, ${result.faqCategories
              .map(faqLabel)
              .join(', ')
              .toLowerCase()}.`}
            tone="primary"
          />
          <ChatBubble text="What name should clients see?" />
          <ChatBubble text="Aurora Studio" outgoing />
          <ChatBubble text="I drafted starting rules from your checkup. Edit anything before it goes live." />
        </View>
      );

    case 'dashboard':
      return (
        <View style={styles.stack}>
          <View style={styles.agentStatus}>
            <View>
              <Text style={styles.agentLabel}>Agent responses</Text>
              <Text style={styles.agentTitle}>{APPROVAL_LABELS[result.approvalMode].split(',')[0]}</Text>
            </View>
            <View style={styles.onPill}>
              <Text style={styles.onPillText}>On</Text>
            </View>
          </View>
          <View style={styles.statGrid}>
            <Metric label="Needs approval" value="3" tone="warning" />
            <Metric label="FAQ replies" value="18" tone="success" />
          </View>
          <Option label="Enable web chat link" selected compact />
          <Option label="Paste Telegram bot token" compact />
        </View>
      );

    default:
      return null;
  }
}

function Paywall({ interaction }: { interaction?: Interaction }) {
  const selected = interaction?.plan ?? 'annual';
  return (
    <View style={styles.stack}>
      {PLANS.map((p) => (
        <PlanCard
          key={p.id}
          name={p.name}
          price={p.price}
          detail={p.perMonth ?? p.billingPeriod}
          trial={p.trial ?? 'No trial'}
          badge={p.badge}
          selected={selected === p.id}
          onPress={interaction ? () => interaction.setPlan(p.id) : undefined}
        />
      ))}
      <View style={styles.termsBlock}>
        <TermLine icon={Clock3} text={PAYWALL_TERMS.trialLength} />
        <TermLine icon={CreditCard} text={PAYWALL_TERMS.paymentDuringTrial} />
        <TermLine icon={TrendingUp} text={PAYWALL_TERMS.renewalPrice} />
        <TermLine icon={ShieldCheck} text={PAYWALL_TERMS.cancellation} />
      </View>
      <Text style={styles.restoreText}>{PAYWALL_TERMS.restorePurchase}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Spec view: gallery + desktop + reference patterns + matrices
// ---------------------------------------------------------------------------

function SpecView() {
  return (
    <>
      <Text style={styles.sectionTitle}>Mobile funnel — full spec</Text>
      <View style={styles.gallery}>
        {FUNNEL_SCREENS.map((screen) => (
          <View key={screen.id} style={styles.mockupBlock}>
            <PhoneFrame screen={screen} />
            <View style={styles.annotation}>
              <Text style={styles.annotationEyebrow}>
                {screen.step} · {screen.eyebrow}
              </Text>
              <Text style={styles.annotationTitle}>{screen.title}</Text>
              <Text style={styles.annotationBody}>{screen.body}</Text>
              <View style={styles.eventPill}>
                <Zap size={12} color={colors.warning} />
                <Text style={styles.eventText}>{screen.event}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Desktop adaptations</Text>
      <View style={styles.desktopGrid}>
        <DesktopPanel variant="diagnostic" />
        <DesktopPanel variant="result" />
        <DesktopPanel variant="paywall" />
        <DesktopPanel variant="handoff" />
      </View>

      <PaywallTermsBlock />
      <CopyMatrix />
      <ReferencePatterns />
    </>
  );
}

function PaywallTermsBlock() {
  const rows: { label: string; value: string }[] = [
    { label: 'Trial length', value: PAYWALL_TERMS.trialLength },
    { label: 'Renewal price', value: PAYWALL_TERMS.renewalPrice },
    { label: 'Billing period', value: PAYWALL_TERMS.billingPeriod },
    { label: 'Payment during trial', value: PAYWALL_TERMS.paymentDuringTrial },
    { label: 'Cancellation path', value: PAYWALL_TERMS.cancellation },
    { label: 'Restore purchase', value: 'Visible link on the paywall' },
    { label: 'Included features', value: PAYWALL_TERMS.includedFeatures.join(' · ') },
  ];
  return (
    <View style={styles.matrixCard}>
      <Text style={styles.sectionTitle}>Transparent paywall terms</Text>
      <Text style={styles.referenceBody}>
        A hard paywall gates features, not disclosure. All six required terms render directly on the
        paywall screen and are mirrored here for compliance review.
      </Text>
      <View style={styles.matrixTable}>
        {rows.map((row) => (
          <View key={row.label} style={styles.matrixRow}>
            <Text style={styles.matrixKey}>{row.label}</Text>
            <Text style={styles.matrixValue}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CopyMatrix() {
  return (
    <View style={styles.matrixCard}>
      <Text style={styles.sectionTitle}>Copy & analytics matrix</Text>
      <Text style={styles.referenceBody}>
        Generated from the same `FUNNEL_SCREENS` data the prototype renders, so copy and event keys
        cannot drift from the build.
      </Text>
      <View style={styles.matrixTable}>
        {FUNNEL_SCREENS.map((screen) => (
          <View key={screen.id} style={styles.matrixRow}>
            <Text style={styles.matrixStep}>{screen.step}</Text>
            <Text style={styles.matrixHeadline}>{screen.title}</Text>
            <Text style={styles.matrixEvent}>{screen.event}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Reference patterns (Fresha-derived structure, Nitime branding)
// ---------------------------------------------------------------------------

function ReferencePatterns() {
  return (
    <View style={styles.referenceSection}>
      <View style={styles.referenceHeader}>
        <Text style={styles.sectionTitle}>Fresha-derived patterns, adapted</Text>
        <Text style={styles.referenceBody}>
          Structure only: soft brand splash, a focused light account sheet, large typography,
          full-width controls, low-priority utility links, and image-forward provider cards. No
          Fresha branding or marketplace positioning is carried over.
        </Text>
      </View>
      <View style={styles.referenceGrid}>
        <SplashReference />
        <AccountReference />
        <ProviderHomeReference />
      </View>
    </View>
  );
}

function SplashReference() {
  return (
    <View style={styles.referencePhone}>
      <View style={styles.lightStatusBar}>
        <Text style={styles.lightStatusText}>9:41</Text>
      </View>
      <View style={styles.washBackground}>
        <View style={styles.washBandBlue} />
        <View style={styles.washBandViolet} />
        <View style={styles.washBandPink} />
        <Text style={styles.splashLogo}>nitime</Text>
        <Text style={styles.splashSubcopy}>Message-first provider automation</Text>
      </View>
    </View>
  );
}

function AccountReference() {
  return (
    <View style={styles.sheetPhone}>
      <View style={styles.sheetBackplate} />
      <View style={styles.accountSheet}>
        <View style={styles.sheetTop}>
          <Text style={styles.sheetTitle}>Create provider account</Text>
          <Text style={styles.closeGlyph}>×</Text>
        </View>
        <Text style={styles.sheetSubtitle}>
          Save your checkup and start configuring your message assistant.
        </Text>
        <SocialRow label="Continue with Apple" />
        <SocialRow label="Continue with Google" />
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>
        <View style={styles.lightField}>
          <Text style={styles.lightPlaceholder}>Email address</Text>
        </View>
        <Pressable style={styles.lightPrimaryButton}>
          <Text style={styles.lightPrimaryText}>Continue</Text>
        </Pressable>
        <View style={styles.utilityLinks}>
          <View style={styles.utilityItem}>
            <Globe2 size={16} color={colors.primary} />
            <Text style={styles.utilityText}>English</Text>
          </View>
          <View style={styles.utilityItem}>
            <LifeBuoy size={16} color={colors.primary} />
            <Text style={styles.utilityText}>Support</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ProviderHomeReference() {
  return (
    <View style={styles.homePhone}>
      <View style={styles.lightStatusBar}>
        <Text style={styles.lightStatusText}>9:41</Text>
        <View style={styles.initialsBubble}>
          <Text style={styles.initialsText}>NS</Text>
        </View>
      </View>
      <Text style={styles.homeGreeting}>Hey, Nina</Text>
      <Text style={styles.homeSectionTitle}>Recommended next steps</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardRail}>
        <ProviderCard title="Approve 3 drafted replies" meta="Inbox" />
        <ProviderCard title="Connect Telegram" meta="Channel setup" />
      </ScrollView>
      <Text style={styles.homeSectionTitle}>New to Nitime</Text>
      <View style={styles.largeCard}>
        <View style={styles.photoPlaceholder}>
          <View style={styles.photoLine} />
          <View style={[styles.photoLine, { width: '62%' }]} />
          <View style={[styles.photoLine, { width: '78%' }]} />
        </View>
        <View style={styles.largeCardBody}>
          <Text style={styles.largeCardTitle}>Train your first FAQ set</Text>
          <Text style={styles.largeCardMeta}>Safe replies · Approval mode</Text>
        </View>
      </View>
    </View>
  );
}

function SocialRow({ label }: { label: string }) {
  return (
    <View style={styles.socialRow}>
      <View style={styles.socialMark} />
      <Text style={styles.socialText}>{label}</Text>
    </View>
  );
}

function ProviderCard({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={styles.providerCard}>
      <View style={styles.providerImage}>
        <Sparkles size={24} color={colors.primary} />
      </View>
      <Text style={styles.providerTitle} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.providerMeta}>{meta}</Text>
      <View style={styles.providerTag}>
        <Text style={styles.providerTagText}>Provider tool</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Progress({ current }: { current: number }) {
  return (
    <View style={styles.progressRow}>
      <Text style={styles.progressText}>
        {current}/{PROGRESS_STEPS}
      </Text>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${(Math.min(current, PROGRESS_STEPS) / PROGRESS_STEPS) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

function Option({
  label,
  selected,
  compact,
  onPress,
}: {
  label: string;
  selected?: boolean;
  compact?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <Check size={12} color={colors.onPrimary} /> : null}
      </View>
      <Text style={styles.optionText}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: Boolean(selected) }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.option,
          selected && styles.optionSelected,
          compact && styles.optionCompact,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View style={[styles.option, selected && styles.optionSelected, compact && styles.optionCompact]}>
      {content}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const style = [styles.chip, selected && styles.chipSelected];
  const text = <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>;
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: Boolean(selected) }}
        onPress={onPress}
        style={({ pressed }) => [...style, pressed && styles.pressed]}
      >
        {text}
      </Pressable>
    );
  }
  return <View style={style}>{text}</View>;
}

function Notice({
  icon: Icon,
  text,
  tone,
}: {
  icon: typeof ShieldCheck;
  text: string;
  tone: 'primary' | 'info' | 'warning' | 'success';
}) {
  const map = {
    primary: { fg: colors.primary, bg: appTint, border: appBorder },
    info: { fg: '#1d6fa5', bg: '#eef8ff', border: '#c7e6fb' },
    warning: { fg: '#a85c00', bg: '#fff6e8', border: '#f0d8b8' },
    success: { fg: '#11855a', bg: '#f0fff7', border: '#cdebdc' },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: map.bg, borderColor: map.border }]}>
      <Icon size={17} color={map.fg} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

function TimelineRow({ day, label, last }: { day: string; label: string; last?: boolean }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineMarker}>
        <Bell size={13} color="#ffffff" />
      </View>
      {!last ? <View style={styles.timelineLine} /> : null}
      <View style={styles.timelineText}>
        <Text style={styles.timelineDay}>{day}</Text>
        <Text style={styles.timelineLabel}>{label}</Text>
      </View>
    </View>
  );
}

function PlanCard({
  name,
  price,
  detail,
  trial,
  badge,
  selected,
  onPress,
}: {
  name: string;
  price: string;
  detail: string;
  trial: string;
  badge?: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <View style={styles.planMain}>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
        <View style={styles.planText}>
          <Text style={styles.planName}>{name}</Text>
          <Text style={styles.planPrice}>{price}</Text>
          <Text style={styles.planDetail}>
            {trial} · {detail}
          </Text>
        </View>
      </View>
      {badge ? (
        <View style={styles.bestValue}>
          <Text style={styles.bestValueText}>{badge}</Text>
        </View>
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: Boolean(selected) }}
        onPress={onPress}
        style={({ pressed }) => [styles.planCard, selected && styles.planCardSelected, pressed && styles.pressed]}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={[styles.planCard, selected && styles.planCardSelected]}>{inner}</View>;
}

function TermLine({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <View style={styles.termLine}>
      <Icon size={14} color={colors.textSecondary} />
      <Text style={styles.termText}>{text}</Text>
    </View>
  );
}

function ChatBubble({ text, outgoing }: { text: string; outgoing?: boolean }) {
  return (
    <View style={[styles.chatBubble, outgoing && styles.chatBubbleOutgoing]}>
      <Text style={[styles.chatText, outgoing && styles.chatTextOutgoing]}>{text}</Text>
    </View>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'success' | 'info' | 'warning' }) {
  const map = {
    primary: { fg: colors.primary, bg: appTint, border: appBorder },
    success: { fg: '#11855a', bg: '#f0fff7', border: '#cdebdc' },
    info: { fg: '#1d6fa5', bg: '#eef8ff', border: '#c7e6fb' },
    warning: { fg: '#a85c00', bg: '#fff6e8', border: '#f0d8b8' },
  }[tone];
  return (
    <View style={[styles.metric, { borderColor: map.border, backgroundColor: map.bg }]}>
      <Text style={[styles.metricValue, { color: map.fg }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function AsideRow({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <View style={styles.asideRow}>
      <Text style={styles.asideRowLabel}>{label}</Text>
      <Text style={[styles.asideRowValue, mono && styles.asideRowMono, strong && styles.asideRowStrong]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function DesktopPanel({ variant }: { variant: 'diagnostic' | 'result' | 'paywall' | 'handoff' }) {
  const copy = {
    diagnostic: {
      title: 'Diagnostic web layout',
      body: 'Question panel left, sticky estimate and progress right.',
      icon: MessageCircle,
    },
    result: {
      title: 'Personalized result',
      body: 'Wide summary panel bridges checkup answers into trial intent.',
      icon: Sparkles,
    },
    paywall: {
      title: 'Paywall web layout',
      body: 'Annual-first card with visible subscription terms.',
      icon: CreditCard,
    },
    handoff: {
      title: 'Setup & dashboard handoff',
      body: 'Imported answers reduce setup friction and make the app feel configured.',
      icon: Inbox,
    },
  }[variant];
  const Icon = copy.icon;

  return (
    <View style={styles.desktopPanel}>
      <View style={styles.desktopTopbar}>
        <Text style={styles.desktopBrand}>Nitime</Text>
        <Icon size={18} color={colors.accent} />
      </View>
      <View style={styles.desktopBody}>
        <Text style={styles.desktopTitle}>{copy.title}</Text>
        <Text style={styles.desktopText}>{copy.body}</Text>
        <View style={styles.desktopSplit}>
          <View style={styles.desktopMain}>
            <Text style={styles.desktopQuestion}>
              {variant === 'paywall' ? '$299 / year' : 'Where do clients message you now?'}
            </Text>
            <Option label={variant === 'paywall' ? '7-day free trial, then $299/year' : 'WhatsApp'} selected compact />
            <Option label={variant === 'paywall' ? '$39 / month, no trial' : 'Telegram'} selected={variant !== 'paywall'} compact />
          </View>
          <View style={styles.desktopAside}>
            <Text style={styles.desktopAsideLabel}>{variant === 'paywall' ? 'Terms' : 'Live estimate'}</Text>
            <Text style={styles.desktopAsideValue}>{variant === 'paywall' ? 'Renewal & cancel visible' : '$1,440 / mo'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const appInk = '#061016';
const appMuted = '#77777b';
const appPaper = '#fbfbfd';
const appCard = '#ffffff';
const appBorder = '#d7d7d9';
const appTint = '#f4f0ff';
const appBlue = '#8ccfff';
const appViolet = '#7c5cff';
const appPink = '#e7a5ff';
const translucentSurface = '#ffffff';
const translucentPanel = '#ebe6ff';

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 80,
    gap: 28,
  },
  hero: {
    gap: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 20,
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
    maxWidth: 760,
    gap: 12,
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
  heroBody: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  heroPanel: {
    minWidth: 280,
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  segmented: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginTop: 4,
    padding: 4,
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.onPrimary,
  },

  // Prototype layout
  prototypeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 28,
    alignItems: 'flex-start',
  },
  protoAside: {
    flex: 1,
    minWidth: 300,
    maxWidth: 460,
    gap: 14,
  },
  asideHeading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  asideBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  asideCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 2,
  },
  asideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  asideRowLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  asideRowValue: {
    flex: 1,
    textAlign: 'right',
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  asideRowMono: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  asideRowStrong: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '900',
  },
  asideNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a5e47',
    backgroundColor: colors.successBg,
    padding: 12,
  },
  asideNoteText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },

  referenceSection: {
    gap: 18,
  },
  referenceHeader: {
    maxWidth: 820,
    gap: 8,
  },
  referenceBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  referenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 22,
    alignItems: 'flex-start',
  },
  referencePhone: {
    width: 300,
    height: 640,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fbfbfd',
    overflow: 'hidden',
  },
  lightStatusBar: {
    height: 58,
    paddingHorizontal: 28,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fbfbfd',
  },
  lightStatusText: {
    color: '#061016',
    fontSize: 14,
    fontWeight: '900',
  },
  washBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#fbfbfd',
  },
  washBandBlue: {
    position: 'absolute',
    left: -80,
    right: 140,
    top: 220,
    height: 220,
    backgroundColor: '#8ccfff',
    opacity: 0.58,
    transform: [{ rotate: '-10deg' }],
  },
  washBandViolet: {
    position: 'absolute',
    left: 32,
    right: -20,
    top: 240,
    height: 250,
    backgroundColor: '#7c5cff',
    opacity: 0.62,
    transform: [{ rotate: '-8deg' }],
  },
  washBandPink: {
    position: 'absolute',
    left: 150,
    right: -120,
    top: 190,
    height: 280,
    backgroundColor: '#e7a5ff',
    opacity: 0.55,
    transform: [{ rotate: '-8deg' }],
  },
  splashLogo: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '900',
  },
  splashSubcopy: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  sheetPhone: {
    width: 300,
    height: 640,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#05080a',
    paddingTop: 42,
    overflow: 'hidden',
  },
  sheetBackplate: {
    height: 42,
    marginHorizontal: 28,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: '#d8d8d8',
  },
  accountSheet: {
    flex: 1,
    marginTop: -26,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingTop: 28,
    gap: 12,
  },
  sheetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  sheetTitle: {
    flex: 1,
    color: '#061016',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  closeGlyph: {
    color: '#061016',
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '300',
  },
  sheetSubtitle: {
    color: '#77777b',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
  },
  socialRow: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d7d7d9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 18,
  },
  socialMark: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#061016',
  },
  socialText: {
    flex: 1,
    color: '#061016',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    marginRight: 40,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e4e4e4',
  },
  orText: {
    color: '#8b8b8d',
    fontSize: 12,
    fontWeight: '700',
  },
  lightField: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d7d7d9',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  lightPlaceholder: {
    color: '#b9b9bd',
    fontSize: 14,
    fontWeight: '700',
  },
  lightPrimaryButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: '#061016',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  utilityLinks: {
    marginTop: 'auto',
    paddingBottom: 18,
    flexDirection: 'row',
    gap: 18,
  },
  utilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  utilityText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  homePhone: {
    width: 300,
    height: 640,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fbfbfd',
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  initialsBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ebe6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  homeGreeting: {
    color: '#061016',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: 38,
  },
  homeSectionTitle: {
    color: '#061016',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 46,
    marginBottom: 16,
  },
  cardRail: {
    marginHorizontal: -18,
    paddingLeft: 18,
  },
  providerCard: {
    width: 190,
    minHeight: 178,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d7d7d9',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    marginRight: 12,
  },
  providerImage: {
    height: 82,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe6ff',
    backgroundColor: '#f4f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerTitle: {
    color: '#061016',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    marginTop: 12,
    marginHorizontal: 12,
  },
  providerMeta: {
    color: '#77777b',
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 12,
    marginTop: 6,
  },
  providerTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d7d7d9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 12,
    marginTop: 10,
  },
  providerTagText: {
    color: '#061016',
    fontSize: 11,
    fontWeight: '800',
  },
  largeCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d7d7d9',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    height: 118,
    backgroundColor: '#edf1f3',
    justifyContent: 'center',
    paddingHorizontal: 22,
    gap: 12,
  },
  photoLine: {
    width: '86%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#cfd8dd',
  },
  largeCardBody: {
    padding: 14,
  },
  largeCardTitle: {
    color: '#061016',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  largeCardMeta: {
    color: '#77777b',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },

  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 28,
    alignItems: 'flex-start',
  },
  mockupBlock: {
    width: 390,
    gap: 14,
  },
  phone: {
    width: 390,
    height: 844,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appPaper,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  phoneDark: {
    backgroundColor: appPaper,
  },
  statusBar: {
    height: 30,
    justifyContent: 'center',
  },
  statusText: {
    color: appInk,
    fontSize: 12,
    fontWeight: '900',
  },
  dynamicIsland: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 142,
    height: 24,
    borderRadius: 12,
    backgroundColor: appInk,
  },
  phoneHeader: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: appInk,
    fontSize: 17,
    fontWeight: '900',
  },
  stepBadge: {
    borderWidth: 1,
    borderColor: appBorder,
    borderRadius: 8,
    backgroundColor: appCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stepBadgeDark: {
    backgroundColor: appCard,
  },
  stepBadgeText: {
    color: appMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  progressRow: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    color: appMuted,
    fontSize: 12,
    fontWeight: '800',
    width: 34,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ebecef',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  screenIntro: {
    marginTop: 30,
    gap: 12,
  },
  phoneTitle: {
    color: appInk,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
  },
  phoneBody: {
    color: appMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  phoneContent: {
    flex: 1,
    marginTop: 26,
  },
  stack: {
    gap: 10,
  },
  pressed: {
    opacity: 0.85,
  },
  featurePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appCard,
    padding: 0,
    gap: 16,
    overflow: 'hidden',
  },
  featureWash: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: appPaper,
  },
  featureWashBlue: {
    position: 'absolute',
    left: -72,
    right: 194,
    top: 70,
    height: 130,
    backgroundColor: appBlue,
    opacity: 0.58,
    transform: [{ rotate: '-10deg' }],
  },
  featureWashViolet: {
    position: 'absolute',
    left: 52,
    right: 20,
    top: 86,
    height: 142,
    backgroundColor: appViolet,
    opacity: 0.62,
    transform: [{ rotate: '-8deg' }],
  },
  featureWashPink: {
    position: 'absolute',
    left: 210,
    right: -82,
    top: 58,
    height: 154,
    backgroundColor: appPink,
    opacity: 0.55,
    transform: [{ rotate: '-8deg' }],
  },
  featureLogo: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
  },
  featureTitle: {
    color: appInk,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    paddingHorizontal: 18,
  },
  featureBody: {
    color: appMuted,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  option: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: translucentSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: translucentPanel,
  },
  optionCompact: {
    minHeight: 42,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: appBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    flex: 1,
    color: appInk,
    fontSize: 14,
    fontWeight: '900',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minWidth: 148,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: translucentSurface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    color: appInk,
    fontSize: 13,
    fontWeight: '900',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  notice: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    color: appInk,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  valuePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9eadf',
    backgroundColor: '#f0fff7',
    padding: 18,
    gap: 7,
    marginTop: 4,
  },
  valueLabel: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  valueAmount: {
    color: appInk,
    fontSize: 30,
    fontWeight: '900',
  },
  valueCaption: {
    color: appMuted,
    fontSize: 11,
  },
  recommendation: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appCard,
    padding: 16,
    gap: 8,
  },
  recommendTitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  recommendText: {
    color: appInk,
    fontSize: 13,
    lineHeight: 19,
  },
  resultPanel: {
    borderRadius: 8,
    backgroundColor: appCard,
    borderWidth: 1,
    borderColor: appBorder,
    padding: 18,
    gap: 12,
  },
  resultEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  resultTitle: {
    color: appInk,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
  },
  resultBody: {
    color: appMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  resultDivider: {
    height: 1,
    backgroundColor: appBorder,
    marginVertical: 4,
  },
  resultAmount: {
    color: appInk,
    fontSize: 28,
    fontWeight: '900',
  },
  trustPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appCard,
    padding: 18,
    gap: 10,
  },
  trustTitle: {
    color: appInk,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  timelineRow: {
    position: 'relative',
    minHeight: 68,
    flexDirection: 'row',
    gap: 14,
  },
  timelineMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 14,
    top: 30,
    width: 2,
    height: 38,
    backgroundColor: appBorder,
  },
  timelineText: {
    flex: 1,
    paddingTop: 1,
  },
  timelineDay: {
    color: appMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  timelineLabel: {
    color: appInk,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 5,
  },
  planCard: {
    minHeight: 92,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appCard,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: appTint,
  },
  planMain: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: appBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  planText: {
    flex: 1,
  },
  planName: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  planPrice: {
    color: appInk,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 6,
  },
  planDetail: {
    color: appMuted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  bestValue: {
    borderRadius: 8,
    backgroundColor: colors.success,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  bestValueText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '900',
  },
  termsBlock: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: '#f7f7f8',
    padding: 14,
    gap: 10,
    marginTop: 2,
  },
  termLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  termText: {
    flex: 1,
    color: appMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  restoreText: {
    color: appMuted,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  chatBubble: {
    maxWidth: '84%',
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appCard,
    padding: 13,
  },
  chatBubbleOutgoing: {
    alignSelf: 'flex-end',
    backgroundColor: appInk,
    borderColor: appInk,
  },
  chatText: {
    color: appInk,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  chatTextOutgoing: {
    color: '#ffffff',
  },
  agentStatus: {
    minHeight: 88,
    borderRadius: 8,
    backgroundColor: appCard,
    borderWidth: 1,
    borderColor: appBorder,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  agentTitle: {
    flex: 1,
    color: appInk,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },
  onPill: {
    borderRadius: 8,
    backgroundColor: colors.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  onPillText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  metricLabel: {
    color: appMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  backButton: {
    width: 54,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    flex: 1,
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primaryActive,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaNeutral: {
    backgroundColor: appCard,
    borderWidth: 1,
    borderColor: appBorder,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  ctaTextNeutral: {
    color: appInk,
  },
  darkText: {
    color: appInk,
  },
  darkSubtext: {
    color: appMuted,
  },
  annotation: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 7,
  },
  annotationEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  annotationTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  annotationBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  eventPill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  matrixCard: {
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 20,
  },
  matrixTable: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  matrixKey: {
    width: 160,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  matrixValue: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  matrixStep: {
    width: 28,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '900',
  },
  matrixHeadline: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  matrixEvent: {
    width: 220,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  desktopPanel: {
    width: 620,
    minHeight: 410,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  desktopTopbar: {
    height: 58,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  desktopBrand: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  desktopBody: {
    padding: 22,
    gap: 12,
  },
  desktopTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  desktopText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  desktopSplit: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 14,
  },
  desktopMain: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: translucentSurface,
    padding: 16,
    gap: 10,
  },
  desktopQuestion: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  desktopAside: {
    width: 190,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 16,
  },
  desktopAsideLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  desktopAsideValue: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    marginTop: 12,
  },
});
