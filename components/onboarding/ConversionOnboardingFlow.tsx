import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { colors } from '@/components/ui';
import { OwlMascot } from '@/components/landing/OwlMascot';
import { useStoreKitSubscription } from '@/hooks/useStoreKitSubscription';
import { onboardingUtils } from '@/utils/onboarding';
import { BrandMark } from './BrandMark';
import {
  type ApprovalChoice,
  type DiagnosticAnswers,
  type DiagnosticResult,
  type FunnelScreen,
  type PlanId,
  FUNNEL_SCREENS,
  PAYWALL_TERMS,
  PLANS,
  PROGRESS_STEPS,
  channelLabel,
  computeResult,
  faqLabel,
  formatCurrencyCents,
} from './funnelData';

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

type FlowProps = {
  initialScreenId?: string;
};

export function ConversionOnboardingFlow({ initialScreenId = 'intro' }: FlowProps) {
  const initialIndex = Math.max(
    0,
    FUNNEL_SCREENS.findIndex((screen) => screen.id === initialScreenId)
  );
  const [index, setIndex] = useState(initialIndex);
  const [answers, setAnswers] = useState<DiagnosticAnswers>(EMPTY_ANSWERS);
  const [plan, setPlan] = useState<PlanId>('annual');

  const screen = FUNNEL_SCREENS[index];
  const result = useMemo(() => computeResult(answers), [answers]);
  const storeKit = useStoreKitSubscription({
    onEntitlementGranted: () => {
      setIndex((current) => Math.min(current + 1, FUNNEL_SCREENS.length - 1));
    },
  });
  const paywallBusy =
    screen.id === 'paywall' &&
    ['purchasing', 'restoring', 'verifying', 'entitled'].includes(storeKit.status);
  const canContinue = isAnswered(screen, answers) && !paywallBusy;

  const setSingle = (key: keyof DiagnosticAnswers, value: string) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const setCents = (cents: number) =>
    setAnswers((prev) => ({ ...prev, clientValueCents: cents }));

  const toggleMulti = (key: 'channels' | 'faqs', value: string) =>
    setAnswers((prev) => {
      const list = prev[key];
      return {
        ...prev,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });

  const completeAndOpenApp = async () => {
    await onboardingUtils.completeOnboarding();
    router.replace('/(tabs)/dashboard');
  };

  const goNext = async () => {
    if (!canContinue) return;
    if (screen.id === 'paywall') {
      await storeKit.purchase(plan);
      return;
    }
    if (screen.id === 'handoff') {
      await completeAndOpenApp();
      return;
    }
    if (index < FUNNEL_SCREENS.length - 1) {
      setIndex((current) => current + 1);
      return;
    }
    await completeAndOpenApp();
  };

  const goBack = () => setIndex((current) => Math.max(0, current - 1));

  const interaction = {
    answers,
    result,
    plan,
    setSingle,
    setCents,
    toggleMulti,
    setPlan,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        <View style={styles.topBar}>
          {index > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.iconButton}
              onPress={goBack}
            >
              <ArrowLeft size={19} color={appInk} />
            </Pressable>
          ) : (
            <View style={styles.iconButtonSpacer} />
          )}
          <BrandMark size={24} />
          <View style={styles.iconButtonSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {screen.step <= PROGRESS_STEPS ? <Progress current={screen.step} /> : null}

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>{screen.eyebrow}</Text>
            <Text style={styles.title}>{screen.title}</Text>
            <Text style={styles.body}>{screen.body}</Text>
          </View>

          <ScreenBody
            screen={screen}
            interaction={interaction}
            storeKit={storeKit}
            onOpenApp={completeAndOpenApp}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canContinue }}
            style={[styles.cta, !canContinue && styles.ctaDisabled]}
            onPress={goNext}
            disabled={!canContinue}
          >
            {paywallBusy ? <ActivityIndicator color="#ffffff" /> : null}
            {!paywallBusy && screen.id === 'dashboard' ? <RotateCcw size={16} color="#ffffff" /> : null}
            <Text style={styles.ctaText}>{paywallBusy ? paywallStatusLabel(storeKit.status) : screen.cta}</Text>
            {!paywallBusy && screen.id !== 'dashboard' ? <ChevronRight size={18} color="#ffffff" /> : null}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function isAnswered(screen: FunnelScreen, answers: DiagnosticAnswers): boolean {
  switch (screen.kind) {
    case 'single':
      return screen.answerKey ? answers[screen.answerKey] != null : true;
    case 'currency':
      return answers.clientValueCents != null;
    case 'multi':
      return screen.answerKey === 'channels' ? answers.channels.length > 0 : answers.faqs.length > 0;
    default:
      return true;
  }
}

type Interaction = {
  answers: DiagnosticAnswers;
  result: DiagnosticResult;
  plan: PlanId;
  setSingle: (key: keyof DiagnosticAnswers, value: string) => void;
  setCents: (cents: number) => void;
  toggleMulti: (key: 'channels' | 'faqs', value: string) => void;
  setPlan: (plan: PlanId) => void;
};

type StoreKitState = ReturnType<typeof useStoreKitSubscription>;

function paywallStatusLabel(status: StoreKitState['status']) {
  switch (status) {
    case 'purchasing':
      return 'Opening App Store...';
    case 'restoring':
      return 'Restoring...';
    case 'verifying':
      return 'Verifying...';
    case 'entitled':
      return 'Trial ready';
    default:
      return 'Please wait...';
  }
};

function ScreenBody({
  screen,
  interaction,
  storeKit,
  onOpenApp,
}: {
  screen: FunnelScreen;
  interaction: Interaction;
  storeKit: StoreKitState;
  onOpenApp: () => Promise<void>;
}) {
  const { answers, result } = interaction;

  switch (screen.kind) {
    case 'intro':
      return (
        <View style={styles.featurePanel}>
          <View style={styles.heroHeader}>
            <View style={styles.owlStage}>
              <OwlMascot size={104} glow={false} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Inbox triage before missed revenue.</Text>
            </View>
          </View>

          <View style={styles.signalStack}>
            <View style={styles.signalRow}>
              <View style={styles.signalIcon}>
                <MessageCircle size={17} color={colors.primaryActive} />
              </View>
              <View style={styles.signalCopy}>
                <Text style={styles.signalTitle}>Client message captured</Text>
                <Text style={styles.signalBody}>Requests stay organized by channel and thread.</Text>
              </View>
            </View>
            <View style={styles.signalRow}>
              <View style={styles.signalIcon}>
                <ShieldCheck size={17} color={colors.success} />
              </View>
              <View style={styles.signalCopy}>
                <Text style={styles.signalTitle}>Draft held for approval</Text>
                <Text style={styles.signalBody}>The agent helps without sending risky replies alone.</Text>
              </View>
            </View>
          </View>

          <Text style={styles.featureTitle}>Most providers do not need more leads first.</Text>
          <Text style={styles.featureBody}>
            They need a faster, safer way to answer the leads already in their inbox. This checkup
            measures that gap before setup begins.
          </Text>
        </View>
      );

    case 'single':
      return (
        <View style={styles.stack}>
          {screen.options?.map((option) => (
            <Option
              key={option.value}
              label={option.label}
              selected={screen.answerKey ? answers[screen.answerKey] === option.value : false}
              recommended={option.recommended}
              onPress={() => screen.answerKey && interaction.setSingle(screen.answerKey, option.value)}
            />
          ))}
          {screen.id === 'profile' ? (
            <Notice icon={ShieldCheck} text="Message assistant only. Clients stay on your own channels." />
          ) : null}
          {screen.id === 'speed' ? (
            <Notice icon={Clock3} text="Late replies are where warm requests turn cold." tone="warning" />
          ) : null}
          {screen.id === 'control' ? (
            <View style={styles.recommendation}>
              <ShieldCheck size={20} color={colors.primary} />
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
            {screen.options?.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={answers.channels.includes(option.value)}
                recommended={option.recommended}
                onPress={() => interaction.toggleMulti('channels', option.value)}
              />
            ))}
          </View>
          <Notice icon={MessageCircle} text="Start with the channel where clients already ask pricing and boundaries." />
        </View>
      ) : (
        <View style={styles.stack}>
          {screen.options?.map((option) => (
            <Option
              key={option.value}
              label={option.label}
              selected={answers.faqs.includes(option.value)}
              recommended={option.recommended}
              onPress={() => interaction.toggleMulti('faqs', option.value)}
            />
          ))}
          <Notice icon={Bot} text="These categories shape the starter agent settings." />
        </View>
      );

    case 'currency':
      return (
        <View style={styles.stack}>
          <View style={styles.chipGrid}>
            {screen.options?.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={answers.clientValueCents === option.cents}
                onPress={() => option.cents != null && interaction.setCents(option.cents)}
              />
            ))}
          </View>
          <ValuePanel result={result} />
        </View>
      );

    case 'result':
      return (
        <View style={styles.resultPanel}>
          <Sparkles size={24} color={colors.primary} />
          <Text style={styles.resultEyebrow}>Recommended setup</Text>
          <Text style={styles.resultTitle}>
            {result.recommendedChannels.map(channelLabel).join(' + ') || 'Web chat'} first
          </Text>
          <Text style={styles.resultBody}>
            Answer {result.faqCategories.map(faqLabel).join(', ').toLowerCase() || 'common'} questions
            with {APPROVAL_LABELS[result.approvalMode].toLowerCase()}.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.resultEyebrow}>Estimated protected opportunity</Text>
          <Text style={styles.resultAmount}>
            {formatCurrencyCents(result.estimatedMonthlyOpportunityCents)} / month
          </Text>
        </View>
      );

    case 'trust':
      return (
        <View style={styles.stack}>
          <View style={styles.trustPanel}>
            <Text style={styles.panelTitle}>Your 7-day trial includes</Text>
            {PAYWALL_TERMS.includedFeatures.map((feature) => (
              <Option key={feature} label={feature} selected compact />
            ))}
          </View>
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
      return <Paywall interaction={interaction} storeKit={storeKit} />;

    case 'handoff':
      return (
        <View style={styles.stack}>
          <Notice
            icon={Sparkles}
            text={`Imported: ${result.recommendedChannels.map(channelLabel).join(', ') || 'Web chat'}, ${result.faqCategories
              .map(faqLabel)
              .join(', ')
              .toLowerCase() || 'common questions'}.`}
          />
          <ChatBubble text="What name should clients see?" />
          <ChatBubble text="Aurora Studio" outgoing />
          <ChatBubble text="I drafted starting rules from your checkup. You can edit channels, replies, and safety controls from the app." />
          <Pressable style={styles.secondaryAction} onPress={onOpenApp}>
            <Text style={styles.secondaryActionText}>Open dashboard now</Text>
          </Pressable>
        </View>
      );

    case 'dashboard':
      return (
        <View style={styles.stack}>
          <View style={styles.agentStatus}>
            <View>
              <Text style={styles.resultEyebrow}>Agent responses</Text>
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

function Progress({ current }: { current: number }) {
  return (
    <View style={styles.progressRow}>
      <Text style={styles.progressText}>
        {current}/{PROGRESS_STEPS}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(current / PROGRESS_STEPS) * 100}%` }]} />
      </View>
    </View>
  );
}

function Option({
  label,
  selected,
  recommended,
  compact,
  onPress,
}: {
  label: string;
  selected?: boolean;
  recommended?: boolean;
  compact?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <Check size={12} color="#ffffff" /> : null}
      </View>
      <Text style={styles.optionText}>{label}</Text>
      {recommended ? (
        <View style={styles.recommendedPill}>
          <Text style={styles.recommendedText}>Best start</Text>
        </View>
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: Boolean(selected) }}
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
  return <View style={[styles.option, selected && styles.optionSelected, compact && styles.optionCompact]}>{content}</View>;
}

function Chip({
  label,
  selected,
  recommended,
  onPress,
}: {
  label: string;
  selected?: boolean;
  recommended?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        recommended && styles.chipRecommended,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Notice({
  icon: Icon,
  text,
  tone = 'primary',
}: {
  icon: typeof ShieldCheck;
  text: string;
  tone?: 'primary' | 'warning' | 'success';
}) {
  const map = {
    primary: { fg: colors.primary, bg: appTint, border: appBorder },
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

function ValuePanel({ result }: { result: DiagnosticResult }) {
  return (
    <View style={styles.valuePanel}>
      <TrendingUp size={22} color="#11855a" />
      <Text style={styles.valueLabel}>
        If {result.coldRequestsPerWeek} request{result.coldRequestsPerWeek === 1 ? '' : 's'} go cold each week
      </Text>
      <Text style={styles.valueAmount}>
        {formatCurrencyCents(result.estimatedMonthlyOpportunityCents)} / month
      </Text>
      <Text style={styles.valueCaption}>Opportunity protected, not guaranteed revenue.</Text>
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

function Paywall({ interaction, storeKit }: { interaction: Interaction; storeKit: StoreKitState }) {
  const selected = interaction.plan;
  const paymentLine = storeKit.isWebTrial
    ? 'Web trial access is enabled for testing; web checkout will be added before public launch'
    : PAYWALL_TERMS.paymentDuringTrial;

  return (
    <View style={styles.stack}>
      {PLANS.map((plan) => (
        <Pressable
          key={plan.id}
          accessibilityRole="radio"
          accessibilityState={{ selected: selected === plan.id }}
          onPress={() => interaction.setPlan(plan.id)}
          style={({ pressed }) => [
            styles.planCard,
            selected === plan.id && styles.planCardSelected,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.planMain}>
            <View style={[styles.radio, selected === plan.id && styles.radioSelected]}>
              {selected === plan.id ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={styles.planText}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>{storeKit.productsByPlan[plan.id]?.displayPrice ?? plan.price}</Text>
              <Text style={styles.planDetail}>
                {plan.trial ?? 'No trial'} · {plan.perMonth ?? plan.billingPeriod}
              </Text>
            </View>
          </View>
          {plan.badge ? (
            <View style={styles.bestValue}>
              <Text style={styles.bestValueText}>{plan.badge}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
      <View style={styles.termsBlock}>
        <TermLine icon={Clock3} text={PAYWALL_TERMS.trialLength} />
        <TermLine icon={CreditCard} text={paymentLine} />
        <TermLine icon={TrendingUp} text={PAYWALL_TERMS.renewalPrice} />
        <TermLine icon={ShieldCheck} text={PAYWALL_TERMS.cancellation} />
      </View>
      {storeKit.error ? (
        <View style={styles.purchaseError}>
          <Text style={styles.purchaseErrorText}>{storeKit.error}</Text>
        </View>
      ) : null}
      <Pressable accessibilityRole="button" style={styles.restoreButton} onPress={storeKit.restore}>
        <Text style={styles.restoreText}>{PAYWALL_TERMS.restorePurchase}</Text>
      </Pressable>
    </View>
  );
}

function TermLine({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <View style={styles.termLine}>
      <Icon size={14} color={appMuted} />
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

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning';
}) {
  const map =
    tone === 'success'
      ? { fg: '#11855a', bg: '#f0fff7', border: '#cdebdc' }
      : { fg: '#a85c00', bg: '#fff6e8', border: '#f0d8b8' };
  return (
    <View style={[styles.metric, { borderColor: map.border, backgroundColor: map.bg }]}>
      <Text style={[styles.metricValue, { color: map.fg }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const appInk = '#061016';
const appMuted = '#77777b';
const appPaper = '#fbfbfd';
const appCard = '#ffffff';
const appBorder = '#d7d7d9';
const appTint = '#f4f0ff';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appPaper,
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: appPaper,
  },
  topBar: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSpacer: {
    width: 42,
    height: 42,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 28,
  },
  progressRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    width: 42,
    color: appMuted,
    fontSize: 12,
    fontWeight: '900',
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
  intro: {
    marginTop: 30,
    marginBottom: 24,
    gap: 10,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: appInk,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
  },
  body: {
    color: appMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  stack: {
    gap: 10,
  },
  featurePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appCard,
    overflow: 'hidden',
    padding: 16,
    gap: 14,
  },
  heroHeader: {
    minHeight: 138,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: '#ebe6ff',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  owlStage: {
    width: 116,
    height: 116,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ded6ff',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryActive,
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroCopy: {
    flex: 1,
    gap: 5,
  },
  heroTitle: {
    color: appInk,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
  },
  signalStack: {
    gap: 8,
  },
  signalRow: {
    minHeight: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appPaper,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  signalIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralBg,
  },
  signalCopy: {
    flex: 1,
    gap: 2,
  },
  signalTitle: {
    color: appInk,
    fontSize: 13,
    fontWeight: '900',
  },
  signalBody: {
    color: appMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  featureTitle: {
    color: appInk,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  featureBody: {
    color: appMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  option: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: appTint,
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
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: {
    flex: 1,
    color: appInk,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  recommendedPill: {
    borderRadius: 999,
    backgroundColor: '#f0fff7',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recommendedText: {
    color: '#11855a',
    fontSize: 10,
    fontWeight: '900',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minWidth: 148,
    flexGrow: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: appCard,
  },
  chipRecommended: {
    borderColor: '#cdebdc',
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
  valuePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9eadf',
    backgroundColor: '#f0fff7',
    padding: 18,
    gap: 7,
  },
  valueLabel: {
    color: '#11855a',
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
  divider: {
    height: 1,
    backgroundColor: appBorder,
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
  panelTitle: {
    color: appInk,
    fontSize: 17,
    fontWeight: '900',
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
    backgroundColor: '#5ae0a3',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  bestValueText: {
    color: appInk,
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
  },
  purchaseError: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0d8b8',
    backgroundColor: '#fff6e8',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  purchaseErrorText: {
    color: '#8f4700',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  restoreButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
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
  secondaryAction: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appBorder,
    backgroundColor: appCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: appInk,
    fontSize: 14,
    fontWeight: '900',
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
  agentTitle: {
    color: appInk,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },
  onPill: {
    borderRadius: 8,
    backgroundColor: '#5ae0a3',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  onPillText: {
    color: appInk,
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
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#ebecef',
    backgroundColor: appPaper,
  },
  cta: {
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
  ctaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.85,
  },
});
