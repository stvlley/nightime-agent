import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Head from 'expo-router/head';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { validateLandingAuthForm } from '@/utils/landingAuthValidation';
import { onboardingUtils } from '@/utils/onboarding';
import { recordLandingIntent } from '@/lib/landingIntents';
import { hasSubscriptionEntitlement } from '@/lib/subscriptions';
import { CookieConsentBanner } from './CookieConsentBanner';
import {
  EarlyAccessSection,
  FaqSection,
  FinalCtaSection,
  HeroSection,
  HowItWorksSection,
  LandingNav,
  RoleSplitSection,
  TrustSection,
  WorkflowSection,
} from './LandingSections';
import { RoleSignupModal } from './RoleSignupModal';
import { LandingAuthMode, LandingSignupErrors, LandingSignupForm, LandingSignupRole } from './types';
import { styles } from './styles';

const SEO_TITLE = 'nitime';
const SEO_DESCRIPTION =
  'Nitime acts like a discreet front desk across messaging channels: it answers questions, qualifies intent, offers available times, and keeps the provider in control.';
const SEO_URL = 'https://nitime.app/';

const initialSignupForm: LandingSignupForm = {
  email: '',
  password: '',
  displayName: '',
};

async function getSignedInStartRoute(
  userId: string
): Promise<'/(onboarding)/onboarding' | '/(onboarding)/pricing' | '/(tabs)/dashboard'> {
  const [onboardingCompleted, subscriptionEntitled] = await Promise.all([
    onboardingUtils.isOnboardingCompleted(),
    hasSubscriptionEntitlement(userId),
  ]);

  if (!onboardingCompleted) return '/(onboarding)/onboarding';
  return subscriptionEntitled ? '/(tabs)/dashboard' : '/(onboarding)/pricing';
}

export function LandingPage() {
  const { width } = useWindowDimensions();
  const isNarrow = width < 760;
  const { user, loading, signIn, signUp } = useAuth();
  const userId = user?.id;
  const { preference, loaded: consentLoaded, savePreference } = useCookieConsent();
  const [authMode, setAuthMode] = useState<LandingAuthMode>('signup');
  const [signupRole, setSignupRole] = useState<LandingSignupRole>('provider');
  const [signupVisible, setSignupVisible] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authRedirectPaused, setAuthRedirectPaused] = useState(false);
  const [form, setForm] = useState<LandingSignupForm>(initialSignupForm);
  const [errors, setErrors] = useState<LandingSignupErrors>({});

  useEffect(() => {
    if (loading || !userId || authRedirectPaused) return;

    let active = true;
    getSignedInStartRoute(userId)
      .then((route) => {
        if (!active) return;
        router.replace(route);
      })
      .catch(() => {
        if (active) router.replace('/(onboarding)/onboarding');
      });

    return () => {
      active = false;
    };
  }, [authRedirectPaused, loading, userId]);

  // Restore native page scrolling on web (root layout/HTML shell sets body to overflow: hidden
  // so authenticated ScrollViews behave; the marketing page needs normal document scroll
  // for anchor links and mobile momentum).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const resetSignup = useCallback(() => {
    setForm(initialSignupForm);
    setErrors({});
    setSignupComplete(false);
    setSubmitting(false);
  }, []);

  const openSignup = (role: LandingSignupRole) => {
    resetSignup();
    setAuthMode('signup');
    setSignupRole(role);
    setSignupVisible(true);
  };

  const openAuth = (mode: LandingAuthMode) => {
    resetSignup();
    setAuthMode(mode);
    setSignupRole('provider');
    setSignupVisible(true);
  };

  const closeSignup = () => {
    setSignupVisible(false);
    setAuthRedirectPaused(false);
    resetSignup();
  };

  const changeSignupRole = (role: LandingSignupRole) => {
    setSignupRole(role);
    setErrors({});
    setSignupComplete(false);
  };

  const changeAuthMode = (mode: LandingAuthMode) => {
    setAuthMode(mode);
    setErrors({});
    setSignupComplete(false);
  };

  const updateForm = (field: keyof LandingSignupForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field] && !current.submit) return current;
      const next = { ...current };
      delete next[field];
      delete next.submit;
      return next;
    });
  };

  const submitSignup = async () => {
    const validationErrors = validateLandingAuthForm(form, signupRole, authMode);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const email = form.email.trim();
    const name = form.displayName.trim();

    if (authMode === 'login') {
      setSubmitting(true);
      setAuthRedirectPaused(true);
      try {
        const result = await signIn(email, form.password);
        if (!result.success) {
          setSubmitting(false);
          setAuthRedirectPaused(false);
          setErrors({ submit: result.error ?? 'Unable to log in.' });
          return;
        }

        await onboardingUtils.setUserLoggedIn(true);
        setSubmitting(false);
        setSignupVisible(false);
        resetSignup();
        router.replace(result.userId ? await getSignedInStartRoute(result.userId) : '/(onboarding)/onboarding');
      } catch (error: any) {
        setSubmitting(false);
        setAuthRedirectPaused(false);
        setErrors({ submit: error?.message ?? 'Unable to log in.' });
      }
      return;
    }

    if (signupRole === 'client') {
      setSubmitting(true);
      try {
        await recordLandingIntent({ role: 'client', email, name });
        setSignupComplete(true);
      } catch {
        setErrors({ submit: 'Could not save your details. Please try again.' });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    setAuthRedirectPaused(true);
    try {
      const result = await signUp(email, form.password, name);
      if (!result.success) {
        setSubmitting(false);
        setAuthRedirectPaused(false);
        setErrors({ submit: result.error ?? 'Unable to create account.' });
        return;
      }

      // Record provider intent in parallel; ignore failures (auth already succeeded).
      void recordLandingIntent({ role: 'provider', email, name });

      await onboardingUtils.resetOnboardingCompletion();
      await onboardingUtils.setUserLoggedIn(true);
      setSubmitting(false);
      setSignupVisible(false);
      resetSignup();
      router.replace('/(onboarding)/onboarding');
    } catch (error: any) {
      setSubmitting(false);
      setAuthRedirectPaused(false);
      setErrors({ submit: error?.message ?? 'Unable to create account.' });
    }
  };

  return (
    <>
      <Head>
        <title>{SEO_TITLE}</title>
        <meta name="description" content={SEO_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESCRIPTION} />
        <meta property="og:url" content={SEO_URL} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO_TITLE} />
        <meta name="twitter:description" content={SEO_DESCRIPTION} />
        <link rel="canonical" href={SEO_URL} />
      </Head>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <LandingNav onOpenAuth={openAuth} onOpenSignup={openSignup} />
          <HeroSection isNarrow={isNarrow} onOpenSignup={openSignup} />
          <RoleSplitSection isNarrow={isNarrow} onOpenSignup={openSignup} />
          <HowItWorksSection isNarrow={isNarrow} />
          <WorkflowSection isNarrow={isNarrow} />
          <TrustSection isNarrow={isNarrow} />
          <EarlyAccessSection isNarrow={isNarrow} />
          <FaqSection />
          <FinalCtaSection isNarrow={isNarrow} onOpenSignup={openSignup} />
        </ScrollView>

        <CookieConsentBanner
          isNarrow={isNarrow}
          visible={consentLoaded && !preference}
          onSavePreference={savePreference}
        />

        <RoleSignupModal
          form={form}
          errors={errors}
          isNarrow={isNarrow}
          mode={authMode}
          role={signupRole}
          signupComplete={signupComplete}
          submitting={submitting}
          visible={signupVisible}
          onClose={closeSignup}
          onFormChange={updateForm}
          onModeChange={changeAuthMode}
          onRoleChange={changeSignupRole}
          onSubmit={submitSignup}
        />
      </SafeAreaView>
    </>
  );
}
