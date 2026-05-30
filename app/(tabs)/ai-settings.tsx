import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Bot, Plus, Shield, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { faqService, FaqItem } from '@/lib/data';
import {
  XStack,
  YStack,
  Text,
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
  Section,
  Surface,
  ToggleRow,
  colors,
} from '@/components/ui';

const DEMO_FAQS: FaqItem[] = [
  { id: '1', trigger: 'What are your rates?', reply: '60 minutes is $80, 90 minutes is $120. Want me to find you a time?', enabled: true },
  { id: '2', trigger: 'What services do you offer?', reply: 'Swedish, Deep Tissue, and Hot Stone sessions are available.', enabled: true },
  { id: '3', trigger: 'How do I book?', reply: "Reply with your preferred date and time. I'll check availability and confirm.", enabled: true },
];

export default function AISettingsScreen() {
  const { user, isSupabaseConfigured } = useAuth();
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [moderationLevel, setModerationLevel] = useState('Medium');
  const [newTrigger, setNewTrigger] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [faqs, setFaqs] = useState<FaqItem[]>(isSupabaseConfigured ? [] : DEMO_FAQS);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    let active = true;
    setLoading(true);
    faqService
      .list(user.id)
      .then((rows) => {
        if (active) setFaqs(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, isSupabaseConfigured]);

  const handleAddFAQ = async () => {
    if (!newTrigger || !newResponse) {
      Alert.alert('Missing fields', 'Add both a client phrase and a response.');
      return;
    }

    if (!isSupabaseConfigured || !user) {
      setFaqs([...faqs, { id: Date.now().toString(), trigger: newTrigger, reply: newResponse, enabled: true }]);
      setNewTrigger('');
      setNewResponse('');
      setShowAddForm(false);
      return;
    }

    setSaving(true);
    try {
      const created = await faqService.create(user.id, newTrigger, newResponse);
      setFaqs([...faqs, created]);
      setNewTrigger('');
      setNewResponse('');
      setShowAddForm(false);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFAQ = (id: string) => {
    Alert.alert('Delete response', 'Remove this saved response?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const previousFaqs = faqs;
          setFaqs(faqs.filter((faq) => faq.id !== id));
          if (isSupabaseConfigured) {
            try {
              await faqService.remove(id);
            } catch (e: any) {
              setFaqs(previousFaqs);
              Alert.alert('Could not delete', e?.message ?? 'Failed to delete FAQ');
            }
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <PageHeader title="Agent Settings" subtitle="Control automated replies and saved responses." />

      <Section title="Automation">
        <YStack gap={10}>
          <ToggleRow
            title="Agent responses"
            subtitle="Allow Nightime Agent to answer eligible inbound messages."
            value={agentEnabled}
            onValueChange={setAgentEnabled}
            icon={Bot}
          />
          <Surface>
            <YStack gap={12}>
              <XStack alignItems="center" gap={10}>
                <Shield size={20} color={colors.warning} />
                <YStack flex={1}>
                  <Text fontSize={15} fontWeight="700" color={colors.text}>Content moderation</Text>
                  <Text fontSize={13} color={colors.textSecondary}>Choose how conservatively messages are filtered.</Text>
                </YStack>
              </XStack>
              <XStack gap={8} flexWrap="wrap">
                {['Low', 'Medium', 'Strict'].map((level) => (
                  <Button
                    key={level}
                    variant={moderationLevel === level ? 'primary' : 'secondary'}
                    onPress={() => setModerationLevel(level)}
                  >
                    {level}
                  </Button>
                ))}
              </XStack>
            </YStack>
          </Surface>
        </YStack>
      </Section>

      <Section
        title="Saved responses"
        action={<Button icon={Plus} variant="secondary" onPress={() => setShowAddForm(!showAddForm)}>{showAddForm ? 'Close' : 'Add'}</Button>}
      >
        <YStack gap={10}>
          {showAddForm ? (
            <Surface>
              <YStack gap={12}>
                <Field label="Client phrase" value={newTrigger} onChangeText={setNewTrigger} placeholder="What are your rates?" />
                <Field label="Agent response" value={newResponse} onChangeText={setNewResponse} placeholder="Write the response" multiline />
                <XStack justifyContent="flex-end" gap={8}>
                  <Button variant="secondary" onPress={() => setShowAddForm(false)}>Cancel</Button>
                  <Button loading={saving} onPress={handleAddFAQ}>Save</Button>
                </XStack>
              </YStack>
            </Surface>
          ) : null}

          {loading ? (
            <LoadingState />
          ) : faqs.length === 0 ? (
            <EmptyState title="No saved responses" message="Add reusable answers for common client questions." />
          ) : (
            faqs.map((faq) => (
              <Surface key={faq.id}>
                <YStack gap={10}>
                  <XStack alignItems="center" justifyContent="space-between" gap={12}>
                    <Badge tone={faq.enabled ? 'success' : 'neutral'}>{faq.enabled ? 'active' : 'off'}</Badge>
                    <IconButton icon={Trash2} label="Delete response" tone="danger" onPress={() => handleDeleteFAQ(faq.id)} />
                  </XStack>
                  <Text fontSize={15} fontWeight="700" color={colors.text}>{faq.trigger}</Text>
                  <Text fontSize={14} color={colors.textSecondary}>{faq.reply}</Text>
                </YStack>
              </Surface>
            ))
          )}
        </YStack>
      </Section>
    </Screen>
  );
}
