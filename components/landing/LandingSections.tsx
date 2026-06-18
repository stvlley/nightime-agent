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
import { HeroAppMockup } from './HeroAppMockup';
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
        accessibilityLabel="nitime home"
      >
        <View style={styles.owlBust}>
          <OwlMascot size={36} glow={false} />
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
      <View style={[styles.hero, isNarrow && styles.stackSection]}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>AI booking for service providers</Text>
          <Text style={[styles.heroTitle, isNarrow && styles.heroTitleMobile]}>
            Your booking inbox, answered before clients go cold.
          </Text>
          <Text style={styles.heroBody}>
            Nitime turns inbound messages into a controlled approval queue: draft replies,
            availability context, and client handoff stay in one provider workspace.
          </Text>
          <DualCta isNarrow={isNarrow} onOpenSignup={onOpenSignup} withIcons />
        </View>

        <View style={styles.heroMockup}>
          <HeroAppMockup compact={isNarrow} />
        </View>
      </View>
    </View>
  );
}

export function RoleSplitSection({ isNarrow, onOpenSignup }: LandingSectionProps) {
  return (
    <View style={styles.band}>
      <SectionIntro
        eyebrow="One provider signup"
        title="Start with the workspace. Clients can book without slowing signup down."
        body="The landing page now defaults to provider account creation. Client access stays lightweight until the public portal is ready."
      />
      <View style={[styles.roleGrid, isNarrow && styles.stackSection]}>
        <RolePanel
          title="Providers"
          body="Launch a controlled AI booking workspace with channel conversations, availability, calendar, replies, and moderation."
          icon={<UsersRound size={24} color={colors.accent} />}
          action="Create provider account"
          onPress={() => onOpenSignup('provider')}
        />
        <RolePanel
          title="Clients"
          body="Join early access for client booking updates. No account choice is required before providers launch their public pages."
          icon={<UserRound size={24} color={colors.accent} />}
          action="Join client updates"
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
    <View style={styles.bandDark}>
      <View style={styles.sectionIntro}>
        <Text style={styles.darkKicker}>Trust and privacy</Text>
        <Text style={styles.darkSectionTitle}>
          Discretion, consent, and control are part of the product surface.
        </Text>
        <Text style={styles.darkSectionBody}>
          The launch plan includes discreet profiles, consent-based follow-ups, clear AI disclosure,
          and an age-gate where required.
        </Text>
      </View>
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
      <View style={[styles.footerPanel, isNarrow && styles.footerPanelMobile]}>
        <View style={styles.footerBrandBlock}>
          <View style={styles.footerBrandRow}>
            <View style={styles.footerOwl}>
              <OwlMascot size={34} glow={false} />
            </View>
            <Text style={styles.footerBrandText}>nitime</Text>
          </View>
          <Text style={styles.footerBody}>
            A controlled booking inbox for providers who need fast replies without giving up
            approval, discretion, or client context.
          </Text>
        </View>

        <View style={[styles.footerCtaBlock, isNarrow && styles.footerCtaBlockMobile]}>
          <Text style={[styles.finalTitle, isNarrow && styles.footerTitleMobile]}>
            Create the workspace, then run the conversion checkup.
          </Text>
          <DualCta isNarrow={isNarrow} onOpenSignup={onOpenSignup} />
        </View>
      </View>

      <View style={[styles.footerMeta, isNarrow && styles.footerMetaMobile]}>
        <Text style={styles.footerMetaText}>Provider-first launch · AI-assisted replies · Approval controls</Text>
        <View style={styles.footerLinks}>
          <Text style={styles.footerLink}>Privacy</Text>
          <Text style={styles.footerLink}>Terms</Text>
          <Text style={styles.footerLink}>Contact</Text>
        </View>
      </View>
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
        accessibilityLabel="Create provider account"
      >
        {withIcons ? <Sparkles size={18} color={colors.onPrimary} /> : null}
        <Text style={styles.primaryButtonLabel}>Create provider account</Text>
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
