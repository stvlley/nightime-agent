import React, { useEffect, useState } from 'react';
import { Switch } from 'react-native';
import { Bot, Plus, Shield, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { faqService, FaqItem } from '@/lib/data';
import { preferencesService } from '@/lib/preferences';
import { confirmAsync } from '@/utils/confirm';
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

type ModerationLevel = 'low' | 'medium' | 'strict';

const MODERATION_LABELS: Record<ModerationLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  strict: 'Strict',
};

export default function AISettingsScreen() {
  const { user, isSupabaseConfigured } = useAuth();
  const [autoSend, setAutoSend] = useState(false);
  const [moderationLevel, setModerationLevel] = useState<ModerationLevel>('medium');
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
    preferencesService
      .get(user.id)
      .then((prefs) => {
        if (!active || !prefs) return;
        setAutoSend(prefs.approval_mode === 'auto_eligible');
        setModerationLevel(prefs.moderation_level);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, isSupabaseConfigured]);

  const handleAutoSendToggle = async (value: boolean) => {
    setAutoSend(value);
    setPrefsError(null);
    if (!isSupabaseConfigured || !user) return;
    try {
      await preferencesService.update(user.id, {
        approval_mode: value ? 'auto_eligible' : 'manual',
      });
    } catch {
      setAutoSend(!value);
      setPrefsError('Could not save the change. Try again.');
    }
  };

  const handleModerationChange = async (level: ModerationLevel) => {
    const previous = moderationLevel;
    setModerationLevel(level);
    setPrefsError(null);
    if (!isSupabaseConfigured || !user) return;
    try {
      await preferencesService.update(user.id, { moderation_level: level });
    } catch {
      setModerationLevel(previous);
      setPrefsError('Could not save the change. Try again.');
    }
  };

  const handleToggleFaq = async (faq: FaqItem, enabled: boolean) => {
    setFaqs((prev) => prev.map((f) => (f.id === faq.id ? { ...f, enabled } : f)));
    if (!isSupabaseConfigured) return;
    try {
      await faqService.setEnabled(faq.id, enabled);
    } catch {
      setFaqs((prev) => prev.map((f) => (f.id === faq.id ? { ...f, enabled: !enabled } : f)));
    }
  };

  const handleAddFAQ = async () => {
    const trigger = newTrigger.trim();
    const response = newResponse.trim();

    if (!trigger || !response) {
      setFormError('Add both a client phrase and a response.');
      return;
    }
    setFormError(null);

    if (!isSupabaseConfigured || !user) {
      setFaqs([...faqs, { id: Date.now().toString(), trigger, reply: response, enabled: true }]);
      setNewTrigger('');
      setNewResponse('');
      setShowAddForm(false);
      return;
    }

    setSaving(true);
    try {
      const created = await faqService.create(user.id, trigger, response);
      setFaqs([...faqs, created]);
      setNewTrigger('');
      setNewResponse('');
      setShowAddForm(false);
    } catch (e: any) {
      setFormError(e?.message ?? 'Could not save the response.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    const ok = await confirmAsync('Delete response', 'Remove this saved response?', 'Delete');
    if (!ok) return;
    const previousFaqs = faqs;
    setFaqs(faqs.filter((faq) => faq.id !== id));
    if (isSupabaseConfigured) {
      try {
        await faqService.remove(id);
      } catch (e: any) {
        setFaqs(previousFaqs);
        setFormError(e?.message ?? 'Could not delete the response.');
      }
    }
  };

  return (
    <Screen>
      <PageHeader title="Agent Settings" subtitle="Control automated replies and saved responses." />

      <Section title="Automation">
        <YStack gap={10}>
          <ToggleRow
            title="Auto-send confident replies"
            subtitle={
              autoSend
                ? 'Exact saved-response matches send instantly. AI drafts always wait for approval.'
                : 'Every reply waits in the Inbox for your approval before it is sent.'
            }
            value={autoSend}
            onValueChange={handleAutoSendToggle}
            icon={Bot}
          />
          <Surface>
            <YStack gap={12}>
              <XStack alignItems="center" gap={10}>
                <Shield size={20} color={colors.warning} />
                <YStack flex={1}>
                  <Text fontSize={15} fontWeight="700" color={colors.text}>Content moderation</Text>
                  <Text fontSize={13} color={colors.textSecondary}>How conservatively flagged topics force a reply into manual review.</Text>
                </YStack>
              </XStack>
              <XStack gap={8} flexWrap="wrap">
                {(Object.keys(MODERATION_LABELS) as ModerationLevel[]).map((level) => (
                  <Button
                    key={level}
                    variant={moderationLevel === level ? 'primary' : 'secondary'}
                    onPress={() => handleModerationChange(level)}
                  >
                    {MODERATION_LABELS[level]}
                  </Button>
                ))}
              </XStack>
            </YStack>
          </Surface>
          {prefsError ? (
            <Text fontSize={13} color={colors.danger}>
              {prefsError}
            </Text>
          ) : null}
        </YStack>
      </Section>

      <Section
        title="Saved responses"
        action={<Button icon={Plus} variant="secondary" onPress={() => setShowAddForm(!showAddForm)}>{showAddForm ? 'Close' : 'Add'}</Button>}
      >
        <YStack gap={10}>
          {formError ? (
            <Text fontSize={13} color={colors.danger}>
              {formError}
            </Text>
          ) : null}
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
                    <XStack alignItems="center" gap={10}>
                      <Switch
                        value={faq.enabled}
                        onValueChange={(value) => handleToggleFaq(faq, value)}
                        trackColor={{ false: colors.border, true: colors.accentDim }}
                        thumbColor={faq.enabled ? colors.primary : '#ffffff'}
                        accessibilityLabel={`Toggle response: ${faq.trigger}`}
                      />
                      <IconButton icon={Trash2} label="Delete response" tone="danger" onPress={() => handleDeleteFAQ(faq.id)} />
                    </XStack>
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
