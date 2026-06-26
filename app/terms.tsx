import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/components/ui';

const sections = [
  ['Service', 'nitime is a provider-side messaging workspace for organizing client messages, drafting replies, saving FAQ answers, managing public profile fields, and connecting supported messaging channels.'],
  ['Eligibility', 'You must be legally able to operate the provider workflow you manage through nitime and comply with laws, platform rules, professional obligations, and client-consent requirements that apply to your business.'],
  ['Accounts', 'You are responsible for keeping account credentials secure and for all activity under your account. Contact support@nitime.app if you believe your account has been compromised.'],
  ['Provider Responsibility', 'You are responsible for your services outside nitime, the accuracy of prices and availability, reviewing AI-assisted replies, obtaining required client consent, and maintaining connected accounts.'],
  ['AI-Assisted Drafts', 'AI output may be incomplete, inaccurate, or inappropriate for a specific client. You must review replies before relying on them, especially for sensitive topics, pricing, cancellations, or safety issues.'],
  ['Payments', 'nitime subscriptions may be sold through Apple In-App Purchase. Direct payment links for PayPal, Venmo, Cash App, or Zelle happen outside nitime. nitime does not process client service payments, hold funds, or resolve payment disputes.'],
  ['Subscriptions', 'nitime Annual is $299/year with a 7-day free trial. nitime Monthly is $39/month with no free trial. Prices may vary by region and App Store settings.'],
  ['Acceptable Use', 'Do not use nitime to violate laws or platform rules, send spam or harassment, store unnecessary sensitive personal information, bypass consent or safety rules, or represent nitime as regulated professional advice.'],
  ['Disclaimers', 'nitime is provided "as is" and "as available." We do not guarantee uninterrupted service, message delivery, booking outcomes, revenue, client conversion, or AI-assisted accuracy.'],
  ['Contact', 'Website: https://nitime.app\nSupport: support@nitime.app'],
];

export default function TermsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Effective date: June 18, 2026</Text>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.body}>
          These Terms govern use of nitime. nitime is not a marketplace, payment processor, escrow service, healthcare provider, legal advisor, tax advisor, or emergency service.
        </Text>
        {sections.map(([heading, body]) => (
          <View key={heading} style={styles.section}>
            <Text style={styles.heading}>{heading}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    minHeight: '100%',
    backgroundColor: colors.background,
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    gap: 18,
  },
  eyebrow: {
    fontFamily: fonts.rounded,
    color: colors.textSecondary,
    fontSize: 14,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
  section: {
    gap: 6,
  },
  heading: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    fontFamily: fonts.rounded,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
});
