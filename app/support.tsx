import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/components/ui';

export default function SupportScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <Text style={styles.title}>nitime Support</Text>
        <Text style={styles.body}>
          For account help, subscription questions, channel setup issues, or account deletion requests, email us from the address tied to your nitime account.
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
            Send Delete my nitime account from the account email address. We will delete or de-identify eligible account data subject to legal, security, billing, and backup retention requirements.
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
  email: {
    fontFamily: fonts.rounded,
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
});
