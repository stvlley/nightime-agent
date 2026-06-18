import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/components/ui';

export default function SupportScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <Text style={styles.title}>Nitime Support</Text>
        <Text style={styles.body}>
          For account help, subscription questions, channel setup issues, or account deletion requests, email us from the address tied to your Nitime account.
        </Text>
        <Text style={styles.email} onPress={() => Linking.openURL('mailto:support@nitime.app')}>
          support@nitime.app
        </Text>
        <View style={styles.section}>
          <Text style={styles.heading}>What to include</Text>
          <Text style={styles.body}>
            Include your account email, the channel affected, a short description of the issue, and any App Store receipt or subscription detail relevant to the request.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>Account deletion</Text>
          <Text style={styles.body}>
            Send Delete my Nitime account from the account email address. We will delete or de-identify eligible account data subject to legal, security, billing, and backup retention requirements.
          </Text>
        </View>
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
    maxWidth: 760,
    alignSelf: 'center',
    gap: 18,
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
  email: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
});
