import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, ChevronRight, RotateCcw } from 'lucide-react-native';
import { colors } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useStoreKitSubscription } from '@/hooks/useStoreKitSubscription';
import { onboardingUtils } from '@/utils/onboarding';
import { BrandMark } from './BrandMark';
import { Progress, ScreenBody, paywallStatusLabel } from './ConversionOnboardingFlowParts';
import { appInk, styles } from './ConversionOnboardingFlowStyles';
import {
  type DiagnosticAnswers,
  type FunnelScreen,
  type PlanId,
  FUNNEL_SCREENS,
  PROGRESS_STEPS,
  computeResult,
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

type FlowProps = {
  initialScreenId?: string;
};

export function ConversionOnboardingFlow({ initialScreenId = 'intro' }: FlowProps) {
  const { user } = useAuth();
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
    await onboardingUtils.completeOnboarding(user?.id);
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
            {paywallBusy ? <ActivityIndicator color={colors.onPrimary} /> : null}
            {!paywallBusy && screen.id === 'dashboard' ? <RotateCcw size={16} color={colors.onPrimary} /> : null}
            <Text style={styles.ctaText}>{paywallBusy ? paywallStatusLabel(storeKit.status) : screen.cta}</Text>
            {!paywallBusy && screen.id !== 'dashboard' ? <ChevronRight size={18} color={colors.onPrimary} /> : null}
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
