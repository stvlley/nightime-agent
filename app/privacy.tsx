import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/components/ui';

const sections = [
  ['Information We Collect', 'We collect account information, provider workspace content, client message content, subscription information, direct payment links, and device or usage information needed to run Nitime.'],
  ['How We Use Information', 'We use information to provide the provider inbox, route messages, generate FAQ and reply suggestions, save approvals, verify subscriptions, maintain public profiles, provide support, and protect the service.'],
  ['AI-Assisted Features', 'Nitime may use automated systems and language models to draft replies or suggest FAQ entries. Providers remain responsible for reviewing replies and deciding what is sent to clients.'],
  ['Sharing Information', 'We share information only as needed with hosting, database, authentication, messaging, App Store, support, security, and legal service providers. We do not sell provider or client message content.'],
  ['Data Retention', 'We retain account, workspace, message, and subscription records while the account is active or as needed for service, legal, tax, audit, security, and backup purposes.'],
  ['Account Deletion', 'To request account deletion, contact support@nitime.app from the account email address with "Delete my Nitime account" in the subject.'],
  ['Security', 'We use reasonable administrative, technical, and organizational safeguards. No internet service is completely secure.'],
  ['Children', 'Nitime is intended for adult providers and is not directed to children.'],
  ['International Use', 'Information may be processed in countries where our service providers operate.'],
  ['Contact', 'Website: https://nitime.app\nSupport: support@nitime.app'],
];

export default function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Effective date: June 18, 2026</Text>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.body}>
          Nitime provides a messaging workspace for independent providers. This policy explains what information we collect, how we use it, and what choices users have. Nitime does not provide medical, legal, tax, financial, or emergency advice.
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
    color: colors.textSecondary,
    fontSize: 14,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
  section: {
    gap: 6,
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
});
