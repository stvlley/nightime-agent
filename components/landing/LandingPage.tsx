import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Head from 'expo-router/head';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { validateLandingAuthForm } from '@/utils/landingAuthValidation';
import { onboardingUtils } from '@/utils/onboarding';
import { recordLandingIntent } from '@/lib/landingIntents';
import { CookieConsentBanner } from './CookieConsentBanner';
import {
  FinalCtaSection,
  HeroSection,
  LandingNav,
  ProductStorySection,
} from './LandingSections';
import { RoleSignupModal } from './RoleSignupModal';
import {
  LandingAuthMode,
  LandingSignupErrors,
  LandingSignupForm,
  LandingSignupRole,
} from './types';
import { styles } from './styles';

const SEO_TITLE = 'nitime';
const SEO_DESCRIPTION =
  'nitime acts like a discreet front desk across messaging channels: it answers questions, qualifies intent, offers available times, and keeps the provider in control.';
const SEO_URL = 'https://nitime.app/';

const initialSignupForm: LandingSignupForm = {
  email: '',
  password: '',
  displayName: '',
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function getSignedInStartRoute(
  userId: string,
): Promise<
  '/(onboarding)/onboarding' | '/(onboarding)/pricing' | '/(tabs)/dashboard'
> {
  const { onboardingCompleted, subscriptionEntitled } =
    await onboardingUtils.getAccessState(userId);

  if (!onboardingCompleted) return '/(onboarding)/onboarding';
  return subscriptionEntitled ? '/(tabs)/dashboard' : '/(onboarding)/pricing';
}

export function LandingPage() {
  const { width } = useWindowDimensions();
  const isNarrow = width < 760;
  const { user, loading, signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();
  const userId = user?.id;
  const {
    preference,
    loaded: consentLoaded,
    savePreference,
  } = useCookieConsent();
  const showCookieConsent =
    Platform.OS === 'web' && consentLoaded && !preference;
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
    const validationErrors = validateLandingAuthForm(
      form,
      signupRole,
      authMode,
    );
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
        router.replace(
          result.userId
            ? await getSignedInStartRoute(result.userId)
            : '/(onboarding)/onboarding',
        );
      } catch (error: unknown) {
        setSubmitting(false);
        setAuthRedirectPaused(false);
        setErrors({ submit: errorMessage(error, 'Unable to log in.') });
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
    } catch (error: unknown) {
      setSubmitting(false);
      setAuthRedirectPaused(false);
      setErrors({ submit: errorMessage(error, 'Unable to create account.') });
    }
  };

  const submitOAuth = async (provider: 'google' | 'apple') => {
    const label = provider === 'apple' ? 'Apple' : 'Google';
    const signIn = provider === 'apple' ? signInWithApple : signInWithGoogle;
    setSubmitting(true);
    setAuthRedirectPaused(true);
    setErrors({});

    try {
      const result = await signIn();
      if (!result.success) {
        setSubmitting(false);
        setAuthRedirectPaused(false);
        setErrors({
          submit: result.error ?? `Unable to continue with ${label}.`,
        });
        return;
      }

      if (authMode === 'signup' && signupRole === 'provider' && result.email) {
        void recordLandingIntent({
          role: 'provider',
          email: result.email,
          name: result.displayName ?? '',
        });
      }

      await onboardingUtils.setUserLoggedIn(true);
      setSubmitting(false);
      setSignupVisible(false);
      resetSignup();

      if (result.profileCreated) {
        await onboardingUtils.resetOnboardingCompletion();
        router.replace('/(onboarding)/onboarding');
        return;
      }

      router.replace(
        result.userId
          ? await getSignedInStartRoute(result.userId)
          : '/(onboarding)/onboarding',
      );
    } catch (error: unknown) {
      setSubmitting(false);
      setAuthRedirectPaused(false);
      setErrors({
        submit: errorMessage(error, `Unable to continue with ${label}.`),
      });
    }
  };

  const submitGoogleAuth = () => submitOAuth('google');
  const submitAppleAuth = () => submitOAuth('apple');

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
        <ScrollView
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
        >
          <LandingNav onOpenAuth={openAuth} onOpenSignup={openSignup} />
          <HeroSection isNarrow={isNarrow} onOpenSignup={openSignup} />
          <ProductStorySection isNarrow={isNarrow} onOpenSignup={openSignup} />
          <FinalCtaSection
            isNarrow={isNarrow}
            onOpenAuth={openAuth}
            onOpenSignup={openSignup}
          />
        </ScrollView>

        <CookieConsentBanner
          isNarrow={isNarrow}
          visible={showCookieConsent}
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
          onGoogleAuth={submitGoogleAuth}
          onAppleAuth={submitAppleAuth}
          onSubmit={submitSignup}
        />
      </SafeAreaView>
    </>
  );
}
