import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Check,
  Clock3,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react-native';
import { colors } from '@/components/ui';
import {
  clientExperience,
  faqs,
  howItWorks,
  providerWorkflow,
} from './content';
import { NightSky } from './NightSky';
import { OwlMascot } from './OwlMascot';
import { LandingAuthMode, LandingSignupRole } from './types';
import { styles } from './styles';

type LandingSectionProps = {
  isNarrow: boolean;
  onOpenSignup: (role: LandingSignupRole) => void;
};

export function LandingNav({
  onOpenAuth,
  onOpenSignup,
}: Pick<LandingSectionProps, 'onOpenSignup'> & { onOpenAuth: (mode: LandingAuthMode) => void }) {
  return (
    <View style={styles.nav}>
      <Pressable
        style={styles.brand}
        onPress={() => router.replace('/')}
        accessibilityRole="link"
        accessibilityLabel="Nightime Agent home"
      >
        <View style={styles.owlBust}>
          <OwlMascot size={36} glow={false} />
        </View>
        <Text style={styles.brandText}>Nightime Agent</Text>
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
          style={styles.textButton}
          onPress={() => onOpenSignup('client')}
          accessibilityRole="button"
          accessibilityLabel="Continue as client"
        >
          <Text style={styles.textButtonLabel}>For clients</Text>
        </Pressable>
        <Pressable
          style={styles.smallButton}
          onPress={() => onOpenSignup('provider')}
          accessibilityRole="button"
          accessibilityLabel="Start as provider"
        >
          <Text style={styles.smallButtonLabel}>Start as provider</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function HeroSection({ isNarrow, onOpenSignup }: LandingSectionProps) {
  return (
    <View style={styles.heroWrap}>
      <NightSky height="100%" />
      <View style={[styles.hero, isNarrow && styles.stackSection]}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>AI booking for service providers</Text>
          <Text style={[styles.heroTitle, isNarrow && styles.heroTitleMobile]}>
            Turn inbound chats into booked appointments.
          </Text>
          <Text style={styles.heroBody}>
            Nightime Agent acts like a discreet front desk across messaging channels: it answers questions,
            qualifies intent, offers available times, and keeps the provider in control.
          </Text>
          <DualCta isNarrow={isNarrow} onOpenSignup={onOpenSignup} withIcons />
        </View>

        <View style={styles.heroMascot} accessibilityElementsHidden>
          <OwlMascot size={isNarrow ? 200 : 280} />
        </View>
      </View>
    </View>
  );
}

export function RoleSplitSection({ isNarrow, onOpenSignup }: LandingSectionProps) {
  return (
    <View style={styles.band}>
      <SectionIntro
        eyebrow="Choose your path"
        title="Built for providers and the clients trying to book them."
        body="One landing flow can capture both sides without changing the provider dashboard or the future customer portal plan."
      />
      <View style={[styles.roleGrid, isNarrow && styles.stackSection]}>
        <RolePanel
          title="Providers"
          body="Launch a controlled AI booking workspace with channel conversations, availability, calendar, replies, and moderation."
          icon={<UsersRound size={24} color={colors.accent} />}
          action="Start as provider"
          onPress={() => onOpenSignup('provider')}
        />
        <RolePanel
          title="Clients"
          body="Find clear profile details, services, available times, and a low-friction booking request experience."
          icon={<UserRound size={24} color={colors.accent} />}
          action="Continue as client"
          onPress={() => onOpenSignup('client')}
        />
      </View>
    </View>
  );
}

export function HowItWorksSection({ isNarrow }: Pick<LandingSectionProps, 'isNarrow'>) {
  return (
    <View style={styles.bandAlt}>
      <SectionIntro
        eyebrow="How it works"
        title="A booking workflow that starts where conversations already happen."
      />
      <View style={[styles.threeGrid, isNarrow && styles.stackSection]}>
        {howItWorks.map((item) => (
          <FeatureCard key={item.title} title={item.title} body={item.body} icon={item.icon} />
        ))}
      </View>
    </View>
  );
}

export function WorkflowSection({ isNarrow }: Pick<LandingSectionProps, 'isNarrow'>) {
  return (
    <View style={[styles.splitBand, isNarrow && styles.stackSection]}>
      <Checklist title="Provider workflow" items={providerWorkflow} />
      <Checklist title="Client experience" items={clientExperience} tone="warm" />
    </View>
  );
}

export function TrustSection({ isNarrow }: Pick<LandingSectionProps, 'isNarrow'>) {
  return (
    <View style={styles.band}>
      <SectionIntro
        eyebrow="Trust and privacy"
        title="Discretion, consent, and control are part of the product surface."
        body="The launch plan includes discreet profiles, consent-based follow-ups, clear AI disclosure, and an age-gate where required."
      />
      <View style={[styles.trustGrid, isNarrow && styles.stackSection]}>
        <TrustItem icon={<LockKeyhole size={20} color={colors.accent} />} label="Discreet provider profiles" />
        <TrustItem icon={<ShieldCheck size={20} color={colors.accent} />} label="Moderation before autonomy" />
        <TrustItem icon={<Mail size={20} color={colors.accent} />} label="Consent-based re-engagement" />
        <TrustItem icon={<Clock3 size={20} color={colors.accent} />} label="Age-gate support for public pages" />
      </View>
    </View>
  );
}

export function EarlyAccessSection({ isNarrow }: Pick<LandingSectionProps, 'isNarrow'>) {
  return (
    <View style={[styles.launchBand, isNarrow && styles.stackSection]}>
      <View style={styles.launchCopy}>
        <Text style={styles.kicker}>Early access</Text>
        <Text style={styles.sectionTitle}>Simple launch pricing before complex billing.</Text>
        <Text style={styles.sectionBody}>
          Providers can start with a usage-limited workspace while payments, portal billing, and channel costs are finalized.
        </Text>
      </View>
      <View style={styles.priceBox}>
        <Text style={styles.priceLabel}>Launch position</Text>
        <Text style={styles.priceValue}>Starter first</Text>
        <Text style={styles.priceBody}>Inbox, AI replies, calendar visibility, FAQ training, and manual approval controls.</Text>
      </View>
    </View>
  );
}

export function FaqSection() {
  return (
    <View style={styles.bandAlt}>
      <SectionIntro eyebrow="FAQ" title="Provider and client basics." />
      <View style={styles.faqList}>
        {faqs.map((faq) => (
          <View key={faq.q} style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{faq.q}</Text>
            <Text style={styles.faqAnswer}>{faq.a}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function FinalCtaSection({ isNarrow, onOpenSignup }: LandingSectionProps) {
  return (
    <View style={styles.finalCta}>
      <NightSky height="100%" showMoon={false} />
      <Text style={styles.finalTitle}>Ready to route booking conversations with less manual back-and-forth?</Text>
      <DualCta isNarrow={isNarrow} onOpenSignup={onOpenSignup} />
    </View>
  );
}

function DualCta({
  isNarrow,
  onOpenSignup,
  withIcons = false,
}: LandingSectionProps & {
  withIcons?: boolean;
}) {
  return (
    <View style={[styles.ctaRow, isNarrow && styles.ctaColumn]}>
      <Pressable
        style={styles.primaryButton}
        onPress={() => onOpenSignup('provider')}
        accessibilityRole="button"
        accessibilityLabel="Start as provider"
      >
        {withIcons ? <Sparkles size={18} color={colors.onPrimary} /> : null}
        <Text style={styles.primaryButtonLabel}>Start as provider</Text>
      </Pressable>
      <Pressable
        style={styles.secondaryButton}
        onPress={() => onOpenSignup('client')}
        accessibilityRole="button"
        accessibilityLabel="Continue as client"
      >
        {withIcons ? <UserRound size={18} color={colors.text} /> : null}
        <Text style={styles.secondaryButtonLabel}>Continue as client</Text>
      </Pressable>
    </View>
  );
}

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <View style={styles.sectionIntro}>
      <Text style={styles.kicker}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
    </View>
  );
}

function RolePanel({
  title,
  body,
  icon,
  action,
  onPress,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.rolePanel, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={action}
    >
      <View style={styles.iconShell}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
      <Text style={styles.inlineAction}>{action}</Text>
    </Pressable>
  );
}

function FeatureCard({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}) {
  return (
    <View style={styles.featureCard}>
      <Icon size={22} color={colors.accent} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

function Checklist({ title, items, tone = 'cool' }: { title: string; items: string[]; tone?: 'cool' | 'warm' }) {
  return (
    <View style={[styles.checklist, tone === 'warm' && styles.checklistWarm]}>
      <Text style={styles.sectionTitleSmall}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.checkRow}>
          <View style={styles.checkDot}>
            <Check size={13} color={colors.onPrimary} />
          </View>
          <Text style={styles.checkText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.trustItem}>
      {icon}
      <Text style={styles.trustText}>{label}</Text>
    </View>
  );
}
