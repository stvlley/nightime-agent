import { Pressable, Text, View } from 'react-native';
import {
  Bell,
  Bot,
  Check,
  Clock3,
  CreditCard,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { colors } from '@/components/ui';
import { OwlMascot } from '@/components/landing/OwlMascot';
import { appBorder, appMuted, appTint, styles } from './ConversionOnboardingFlowStyles';
import type { useStoreKitSubscription } from '@/hooks/useStoreKitSubscription';
import {
  type ApprovalChoice,
  type DiagnosticAnswers,
  type DiagnosticResult,
  type FunnelScreen,
  type PlanId,
  PAYWALL_TERMS,
  PLANS,
  PROGRESS_STEPS,
  channelLabel,
  faqLabel,
  formatCurrencyCents,
} from './funnelData';

const APPROVAL_LABELS: Record<ApprovalChoice, string> = {
  draft_all: 'Draft everything for approval',
  safe_faq_auto: 'Safe FAQs auto, sensitive cases held',
  routine_auto: 'Routine messages auto-answered',
};

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

export function paywallStatusLabel(status: StoreKitState['status']) {
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
}

export function ScreenBody({
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

export function Progress({ current }: { current: number }) {
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
        {selected ? <Check size={12} color={colors.onPrimary} /> : null}
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
    warning: { fg: colors.warning, bg: colors.warningBg, border: colors.borderStrong },
    success: { fg: colors.success, bg: colors.successBg, border: colors.borderStrong },
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
      <TrendingUp size={22} color={colors.success} />
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
        <Bell size={13} color={colors.onPrimary} />
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
      ? { fg: colors.success, bg: colors.successBg, border: colors.borderStrong }
      : { fg: colors.warning, bg: colors.warningBg, border: colors.borderStrong };
  return (
    <View style={[styles.metric, { borderColor: map.border, backgroundColor: map.bg }]}>
      <Text style={[styles.metricValue, { color: map.fg }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}
