import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NightSky } from './NightSky';
import { OwlMascot } from './OwlMascot';
import { HeroAppMockup } from './HeroAppMockup';
import { LandingAuthMode, LandingSignupRole } from './types';
import { styles } from './styles';

type LandingSectionProps = {
  isNarrow: boolean;
  onOpenSignup: (role: LandingSignupRole) => void;
};

type LandingFooterProps = LandingSectionProps & {
  onOpenAuth: (mode: LandingAuthMode) => void;
};

const storySteps = [
  {
    title: 'Requests arrive with the details intact.',
    body: 'Inbound booking messages land beside availability, rates, boundaries, and notes.',
  },
  {
    title: 'A reply draft is prepared in your tone.',
    body: 'Drafts use your saved rules and voice, ready for review.',
  },
  {
    title: 'The provider reviews the next step.',
    body: 'Approve, edit, or take over before anything is sent.',
  },
];

export function LandingNav({
  onOpenAuth,
  onOpenSignup,
}: Pick<LandingSectionProps, 'onOpenSignup'> & {
  onOpenAuth: (mode: LandingAuthMode) => void;
}) {
  return (
    <View style={styles.nav}>
      <Pressable
        style={styles.brand}
        onPress={() => router.replace('/')}
        accessibilityRole="link"
        accessibilityLabel="nitime home"
      >
        <View style={styles.owlBust}>
          <OwlMascot size={34} glow={false} />
        </View>
        <Text style={styles.brandText}>nitime</Text>
      </Pressable>
      <View style={styles.navActions}>
        <Pressable
          style={styles.textButton}
          onPress={() => onOpenAuth('login')}
          accessibilityRole="button"
          accessibilityLabel="Log in"
        >
          <Text style={styles.textButtonLabel}>Log in</Text>
        </Pressable>
        <Pressable
          style={styles.smallButton}
          onPress={() => onOpenSignup('provider')}
          accessibilityRole="button"
          accessibilityLabel="Create provider account"
        >
          <Text style={styles.smallButtonLabel}>Create account</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function HeroSection({ isNarrow, onOpenSignup }: LandingSectionProps) {
  return (
    <View style={styles.heroWrap}>
      <NightSky height="100%" />
      <View
        style={[
          styles.hero,
          isNarrow && styles.stackSection,
          isNarrow && styles.heroMobile,
        ]}
      >
        <View style={styles.heroCopy}>
          <Text style={[styles.heroTitle, isNarrow && styles.heroTitleMobile]}>
            A discreet front desk for high-touch appointment work.
          </Text>
          <Text style={styles.heroBody}>
            <Text style={styles.heroLogoMention}>nitime</Text> keeps requests, availability, and reply drafts in one private
            desk so providers can answer faster without losing control.
          </Text>
          <DualCta isNarrow={isNarrow} onOpenSignup={onOpenSignup} />
        </View>

        <View style={[styles.heroMockup, isNarrow && styles.heroMockupMobile]}>
          <HeroAppMockup compact={isNarrow} />
        </View>
      </View>
    </View>
  );
}

export function ProductStorySection({
  isNarrow,
  onOpenSignup,
}: LandingSectionProps) {
  return (
    <View style={styles.storyBand}>
      <View style={[styles.storyLayout, isNarrow && styles.stackSection]}>
        <View style={styles.storyIntro}>
          <Text style={styles.kicker}>How the desk works</Text>
          <Text
            style={[styles.storyTitle, isNarrow && styles.storyTitleMobile]}
          >
            Quiet operations for requests that need judgment.
          </Text>
          <Text style={styles.storyBody}>
            A calmer way to handle inbound interest before a booking is
            accepted.
          </Text>
          <Pressable
            style={styles.clientTextAction}
            onPress={() => onOpenSignup('client')}
            accessibilityRole="button"
            accessibilityLabel="Join client updates"
          >
            <Text style={styles.clientTextActionLabel}>
              Join client updates
            </Text>
          </Pressable>
        </View>

        <View style={styles.storySteps}>
          {storySteps.map((step, index) => (
            <View key={step.title} style={styles.storyStep}>
              <Text style={styles.storyStepNumber}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <View style={styles.storyStepCopy}>
                <Text style={styles.storyStepTitle}>{step.title}</Text>
                <Text style={styles.storyStepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function FinalCtaSection({
  isNarrow,
  onOpenAuth,
  onOpenSignup,
}: LandingFooterProps) {
  return (
    <View style={styles.finalCta}>
      <NightSky height="100%" showMoon={false} />
      <View style={[styles.footerPanel, isNarrow && styles.footerPanelMobile]}>
        <View style={[styles.footerTop, isNarrow && styles.footerTopMobile]}>
          <View style={styles.footerBrandBlock}>
            <View style={styles.footerBrandRow}>
              <View style={styles.footerOwl}>
                <OwlMascot size={32} glow={false} />
              </View>
              <Text style={styles.footerBrandText}>nitime</Text>
            </View>
            <Text style={styles.footerBody}>
              Private booking operations for providers who work from their own
              channels.
            </Text>
          </View>

          <View
            style={[
              styles.footerCtaBlock,
              isNarrow && styles.footerCtaBlockMobile,
            ]}
          >
            <Text
              style={[styles.finalTitle, isNarrow && styles.footerTitleMobile]}
            >
              Create the workspace before the next request goes cold.
            </Text>
            <DualCta isNarrow={isNarrow} onOpenSignup={onOpenSignup} />
          </View>
        </View>

        <View
          style={[styles.footerColumns, isNarrow && styles.footerColumnsMobile]}
        >
          <FooterColumn isNarrow={isNarrow} title="Product">
            <FooterAction
              label="Create provider account"
              accessibilityLabel="Create provider account"
              onPress={() => onOpenSignup('provider')}
            />
            <FooterAction
              label="Join client updates"
              accessibilityLabel="Join client updates"
              onPress={() => onOpenSignup('client')}
            />
            <FooterAction
              label="Log in"
              accessibilityLabel="Log in"
              onPress={() => onOpenAuth('login')}
            />
          </FooterColumn>

          <FooterColumn isNarrow={isNarrow} title="Company">
            <FooterAction
              label="Support"
              accessibilityLabel="Support"
              role="link"
              onPress={() => router.push('/support')}
            />
          </FooterColumn>

          <FooterColumn isNarrow={isNarrow} title="Legal">
            <FooterAction
              label="Privacy"
              accessibilityLabel="Privacy policy"
              role="link"
              onPress={() => router.push('/privacy')}
            />
            <FooterAction
              label="Terms"
              accessibilityLabel="Terms of service"
              role="link"
              onPress={() => router.push('/terms')}
            />
          </FooterColumn>
        </View>
      </View>

      <Text style={styles.footerMetaText}>
        Provider-first launch | Draft review | Booking context
      </Text>
    </View>
  );
}

function DualCta({ isNarrow, onOpenSignup }: LandingSectionProps) {
  return (
    <View style={[styles.ctaRow, isNarrow && styles.ctaColumn]}>
      <Pressable
        style={styles.primaryButton}
        onPress={() => onOpenSignup('provider')}
        accessibilityRole="button"
        accessibilityLabel="Create provider account"
      >
        <Text style={styles.primaryButtonLabel}>Create provider account</Text>
      </Pressable>
    </View>
  );
}

function FooterColumn({
  children,
  isNarrow,
  title,
}: {
  children: React.ReactNode;
  isNarrow: boolean;
  title: string;
}) {
  return (
    <View style={[styles.footerColumn, isNarrow && styles.footerColumnMobile]}>
      <Text style={styles.footerColumnTitle}>{title}</Text>
      <View style={styles.footerColumnLinks}>{children}</View>
    </View>
  );
}

function FooterAction({
  accessibilityLabel,
  label,
  onPress,
  role = 'button',
}: {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  role?: 'button' | 'link';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.footerLink}>{label}</Text>
    </Pressable>
  );
}
