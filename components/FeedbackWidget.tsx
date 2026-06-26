import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { MessageSquareHeart, Send, X } from 'lucide-react-native';
import { Button, Field, IconButton, Text, XStack, YStack, colors } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import {
  SupportFeedbackType,
  isRemoteSupportFeedbackConfigured,
  submitSupportFeedback,
} from '@/utils/supportFeedback';

const TYPES: { value: SupportFeedbackType; label: string }[] = [
  { value: 'feedback', label: 'Feedback' },
  { value: 'bug', label: 'Bug' },
  { value: 'help', label: 'Help' },
];

export function FeedbackWidget({ route }: { route?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SupportFeedbackType>('feedback');
  const [email, setEmail] = useState(user?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const resetForm = () => {
    setType('feedback');
    setEmail(user?.email ?? '');
    setSubject('');
    setMessage('');
    setStatus(null);
  };

  const close = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatus(null);

    try {
      const result = await submitSupportFeedback({
        type,
        email,
        subject,
        message,
        route,
        user: user
          ? {
              id: user.id,
              email: user.email,
              name: user.profile?.display_name || user.profile?.business_name || undefined,
            }
          : undefined,
      });

      setSubject('');
      setMessage('');
      setStatus({
        tone: 'success',
        text:
          result.mode === 'remote'
            ? `Submitted${result.ticketNumber ? ` as ticket #${result.ticketNumber}` : ''}.`
            : 'Saved locally. Connect Stride Support env vars to submit tickets.',
      });
    } catch (error) {
      setStatus({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Could not submit feedback.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button icon={MessageSquareHeart} variant="secondary" onPress={() => setOpen(true)}>
        Send feedback
      </Button>

      <Modal animationType="fade" transparent visible={open} onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View style={styles.card}>
            <YStack gap={16}>
              <XStack alignItems="center" justifyContent="space-between" gap={12}>
                <YStack flex={1} gap={4}>
                  <Text fontSize={20} fontWeight="800" color={colors.text}>
                    Send feedback
                  </Text>
                  <Text fontSize={13} color={colors.textSecondary}>
                    {isRemoteSupportFeedbackConfigured()
                      ? 'This creates a support ticket for the nitime team.'
                      : 'Dev mode stores this locally until Stride Support is configured.'}
                  </Text>
                </YStack>
                <IconButton icon={X} label="Close feedback form" onPress={close} />
              </XStack>

              <XStack gap={8} flexWrap="wrap">
                {TYPES.map((item) => {
                  const selected = item.value === type;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityState={selected ? { selected: true } : undefined}
                      onPress={() => setType(item.value)}
                      style={[styles.typeButton, selected && styles.typeButtonSelected]}
                    >
                      <Text
                        fontSize={13}
                        fontWeight="800"
                        color={selected ? colors.primary : colors.textSecondary}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </XStack>

              <Field
                label="Reply email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
              />
              <Field
                label="Subject"
                value={subject}
                onChangeText={setSubject}
                placeholder="Short summary"
              />
              <Field
                label="Details"
                value={message}
                onChangeText={setMessage}
                placeholder="What happened, what did you expect, or what should improve?"
                multiline
              />

              {status ? (
                <Text fontSize={13} color={status.tone === 'success' ? colors.success : colors.danger}>
                  {status.text}
                </Text>
              ) : null}

              <XStack gap={10} justifyContent="flex-end" flexWrap="wrap">
                <Button variant="ghost" onPress={close}>
                  Cancel
                </Button>
                <Button icon={Send} onPress={handleSubmit} loading={submitting}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
              </XStack>
            </YStack>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(33, 27, 24, 0.42)',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    shadowColor: colors.text,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  typeButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  typeButtonSelected: {
    borderColor: colors.accentDim,
    backgroundColor: colors.neutralBg,
  },
});
