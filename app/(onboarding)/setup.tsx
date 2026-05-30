import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Bell, Bot, Check, Plus, Save, Trash2 } from 'lucide-react-native';
import {
  Badge,
  Button,
  Field,
  IconButton,
  PageHeader,
  Screen,
  Surface,
  Text,
  XStack,
  YStack,
  colors,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { onboardingUtils } from '@/utils/onboarding';
import {
  NotificationPermissionState,
  SetupAvailabilityDraft,
  SetupPayload,
  SetupServiceDraft,
  defaultSetupPayload,
  setupPayloadFromLoaded,
  setupService,
} from '@/utils/setup';
import {
  SetupInferenceResult,
  applySetupInferenceSuggestions,
  suggestSetupDefaults,
} from '@/utils/setupInference';
import {
  SetupChatAnswer,
  SetupChatNodeId,
  applySetupChatAnswer,
  buildSetupReviewItems,
  formatSetupChatAnswer,
  getNextSetupChatNodeId,
  getSetupChatNode,
  getSetupChatProgress,
  validateSetupChatAnswer,
} from '@/utils/setupChatFlow';

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type TranscriptMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

type HistoryEntry = {
  nodeId: SetupChatNodeId;
  payload: SetupPayload;
  transcript: TranscriptMessage[];
};

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function assistantMessage(text: string): TranscriptMessage {
  return { id: messageId(), role: 'assistant', text };
}

function userMessage(text: string): TranscriptMessage {
  return { id: messageId(), role: 'user', text };
}

export default function SetupScreen() {
  const { user, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<SetupPayload>(defaultSetupPayload());
  const [nodeId, setNodeId] = useState<SetupChatNodeId>('business');
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([
    assistantMessage(getSetupChatNode('business').prompt),
  ]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [pendingInference, setPendingInference] = useState<SetupInferenceResult | null>(null);
  const [draftText, setDraftText] = useState('');
  const [draftChannels, setDraftChannels] = useState<string[]>([]);
  const [draftServices, setDraftServices] = useState<SetupServiceDraft[]>([]);
  const [draftAvailability, setDraftAvailability] = useState<SetupAvailabilityDraft>(
    defaultSetupPayload().availability
  );

  const node = getSetupChatNode(nodeId);
  const progress = getSetupChatProgress(nodeId, payload);
  const transcriptRef = useRef<ScrollView>(null);
  const assistantTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      transcriptRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timer);
  }, [transcript, assistantTyping, nodeId]);

  useEffect(() => {
    return () => {
      if (assistantTimerRef.current) {
        clearTimeout(assistantTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/');
      return;
    }

    let mounted = true;
    setupService
      .load(user.id)
      .then((state) => {
        if (!mounted) return;
        const fallbackName = user.profile?.business_name ?? '';
        const loadedPayload = setupPayloadFromLoaded(state, fallbackName);
        setPayload(loadedPayload);
        setDraftText(loadedPayload.businessName);
        setDraftChannels(loadedPayload.messageChannels);
        setDraftServices(loadedPayload.services);
        setDraftAvailability(loadedPayload.availability);
        setPendingInference(null);
        setTranscript([assistantMessage(getSetupChatNode('business').prompt)]);
      })
      .catch((error) => {
        Alert.alert('Setup', error.message ?? 'Could not load setup details.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (nodeId === 'business') setDraftText(payload.businessName);
    if (nodeId === 'questions') setDraftText(payload.commonQuestions.join('\n'));
    if (nodeId === 'boundaries') setDraftText(payload.responseBoundaries);
    if (nodeId === 'channels') setDraftChannels(payload.messageChannels);
    if (nodeId === 'offers') setDraftServices(payload.services.length ? payload.services : []);
    if (nodeId === 'availability') setDraftAvailability(payload.availability);
  }, [nodeId, payload]);

  const reviewItems = useMemo(() => buildSetupReviewItems(payload), [payload]);

  const submitAnswer = async (answer: SetupChatAnswer) => {
    if (assistantTyping || saving) return;

    const validation = validateSetupChatAnswer(nodeId, answer, payload);
    if (!validation.valid) {
      Alert.alert(validation.title, validation.message);
      return;
    }

    const answeredNodeId = nodeId;
    const answeredPayload = payload;
    let nextPayload = applySetupChatAnswer(nodeId, payload, answer);

    if (nodeId === 'suggestions' && answer === true && pendingInference) {
      nextPayload = applySetupInferenceSuggestions(nextPayload, pendingInference.suggestions);
    }

    const nextNodeId = getNextSetupChatNodeId(nodeId, nextPayload);
    const nextNode = getSetupChatNode(nextNodeId);
    const answeredTranscript = [...transcript, userMessage(formatSetupChatAnswer(nodeId, answer))];

    setHistory((current) => [...current, { nodeId: answeredNodeId, payload: answeredPayload, transcript }]);
    setPayload(nextPayload);
    setTranscript(answeredTranscript);
    setAssistantTyping(true);

    let inference = pendingInference;
    if (nextNodeId === 'suggestions') {
      inference = await suggestSetupDefaults(nextPayload);
      setPendingInference(inference);
    } else if (answeredNodeId === 'suggestions') {
      setPendingInference(null);
    }

    if (assistantTimerRef.current) {
      clearTimeout(assistantTimerRef.current);
    }

    assistantTimerRef.current = setTimeout(() => {
      const prompt =
        nextNodeId === 'suggestions' && inference
          ? `${nextNode.prompt}\n\n${inference.summary}`
          : nextNode.prompt;
      setNodeId(nextNodeId);
      setTranscript((current) => [...current, assistantMessage(prompt)]);
      setAssistantTyping(false);
      assistantTimerRef.current = null;
    }, 520);
  };

  const goBack = () => {
    const previous = history[history.length - 1];
    if (!previous) return;

    if (assistantTimerRef.current) {
      clearTimeout(assistantTimerRef.current);
      assistantTimerRef.current = null;
    }

    setNodeId(previous.nodeId);
    setPayload(previous.payload);
    setTranscript(previous.transcript);
    setAssistantTyping(false);
    setPendingInference(null);
    setHistory((current) => current.slice(0, -1));
  };

  const toggleChannel = (channel: string) => {
    setDraftChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]
    );
  };

  const updateService = (index: number, partial: Partial<SetupServiceDraft>) => {
    setDraftServices((current) =>
      current.map((service, serviceIndex) => (serviceIndex === index ? { ...service, ...partial } : service))
    );
  };

  const addService = () => {
    setDraftServices((current) => [...current, { name: '', durationMinutes: 60, price: '0' }]);
  };

  const removeService = (index: number) => {
    setDraftServices((current) => current.filter((_, serviceIndex) => serviceIndex !== index));
  };

  const toggleDay = (day: number) => {
    setDraftAvailability((current) => {
      const selected = current.days.includes(day);
      return {
        ...current,
        days: selected ? current.days.filter((item) => item !== day) : [...current.days, day].sort(),
      };
    });
  };

  const requestNotificationPermission = async () => {
    setNotificationBusy(true);
    try {
      let permission: NotificationPermissionState = 'unsupported';

      if (Platform.OS === 'web') {
        const notificationApi = (globalThis as any).Notification;
        if (notificationApi?.requestPermission) {
          const result = await notificationApi.requestPermission();
          permission = result === 'granted' ? 'granted' : 'denied';
        }
      }

      await submitAnswer(permission);
    } finally {
      setNotificationBusy(false);
    }
  };

  const saveSetup = async () => {
    if (!user) {
      router.replace('/');
      return;
    }

    setSaving(true);
    try {
      await setupService.save(user.id, user.email, payload);
      await onboardingUtils.completeOnboarding();
      await onboardingUtils.setUserLoggedIn(true);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Setup not saved', error.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <Screen>
        <PageHeader title="Setup" subtitle="Loading your provider setup." />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <PageHeader title="Setup chat" subtitle="Build your message assistant from a guided conversation." />

      <YStack gap={8}>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={12} fontWeight="700" color={colors.textSecondary}>
            Message setup {progress.current} of {progress.total}
          </Text>
          <Badge tone={nodeId === 'review' ? 'success' : 'primary'}>{node.label}</Badge>
        </XStack>
        <XStack gap={4}>
          {Array.from({ length: progress.total }).map((_, index) => (
            <YStack
              key={index}
              flex={1}
              height={5}
              borderRadius={4}
              backgroundColor={index < progress.current ? colors.primary : colors.border}
            />
          ))}
        </XStack>
      </YStack>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <YStack flex={1} gap={12}>
          <Surface style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
            <ScrollView
              ref={transcriptRef}
              contentContainerStyle={{ padding: 14, gap: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {transcript.map((message) =>
                message.role === 'assistant' ? (
                  <AssistantBubble key={message.id}>{message.text}</AssistantBubble>
                ) : (
                  <UserBubble key={message.id}>{message.text}</UserBubble>
                )
              )}
              {assistantTyping ? <TypingBubble /> : null}
            </ScrollView>
          </Surface>

          <Surface style={{ padding: 12 }}>
            <YStack gap={12}>
              {renderComposer()}
              <XStack gap={10} justifyContent="space-between">
                <Button
                  icon={ArrowLeft}
                  variant="secondary"
                  disabled={history.length === 0 || saving || assistantTyping}
                  onPress={goBack}
                >
                  Back
                </Button>
                {nodeId === 'review' ? (
                  <Button icon={Save} loading={saving} onPress={saveSetup}>
                    Save setup
                  </Button>
                ) : null}
              </XStack>
            </YStack>
          </Surface>
        </YStack>
      </KeyboardAvoidingView>
    </Screen>
  );

  function renderComposer() {
    switch (node.answerKind) {
      case 'text':
        return (
          <YStack gap={10}>
            <Field value={draftText} onChangeText={setDraftText} placeholder="Business or provider name" />
            <Button icon={Check} disabled={assistantTyping} onPress={() => submitAnswer(draftText)}>
              Send
            </Button>
          </YStack>
        );
      case 'textarea':
        return (
          <YStack gap={10}>
            <Field
              value={draftText}
              onChangeText={setDraftText}
              placeholder={nodeId === 'questions' ? 'Rates?\nAre you available tonight?' : 'Anything it should avoid?'}
              multiline
            />
            <Button icon={Check} disabled={assistantTyping} onPress={() => submitAnswer(draftText)}>
              Send
            </Button>
          </YStack>
        );
      case 'single':
        return (
          <XStack flexWrap="wrap" gap={8}>
            {node.quickReplies?.map((reply) => (
              <ChoiceButton
                key={reply}
                label={reply}
                selected={isSelectedSingle(reply)}
                disabled={assistantTyping}
                onPress={() => submitAnswer(reply)}
              />
            ))}
          </XStack>
        );
      case 'multi':
        return (
          <YStack gap={10}>
            <XStack flexWrap="wrap" gap={8}>
              {node.quickReplies?.map((reply) => (
                <ChoiceButton
                  key={reply}
                  label={reply}
                  selected={draftChannels.includes(reply)}
                  disabled={assistantTyping}
                  onPress={() => toggleChannel(reply)}
                />
              ))}
            </XStack>
            <Button icon={Check} disabled={assistantTyping} onPress={() => submitAnswer(draftChannels)}>
              Send
            </Button>
          </YStack>
        );
      case 'suggestions':
        return (
          <YStack gap={12}>
            {pendingInference ? (
              <YStack gap={8}>
                <SuggestionRow label="Channels" value={pendingInference.suggestions.messageChannels.join(', ')} />
                <SuggestionRow
                  label="Offers"
                  value={pendingInference.suggestions.services.map((service) => service.name).join(', ')}
                />
                <SuggestionRow label="Tone" value={pendingInference.suggestions.agentTone} />
                <SuggestionRow label="Boundaries" value={pendingInference.suggestions.responseBoundaries} />
              </YStack>
            ) : (
              <Text fontSize={13} color={colors.textSecondary}>
                Preparing suggestions...
              </Text>
            )}
            <XStack gap={10}>
              <YStack flex={1}>
                <Button
                  variant="ghost"
                  disabled={!pendingInference || assistantTyping}
                  onPress={() => submitAnswer(false)}
                >
                  Skip
                </Button>
              </YStack>
              <YStack flex={1}>
                <Button
                  icon={Check}
                  disabled={!pendingInference || assistantTyping}
                  onPress={() => submitAnswer(true)}
                >
                  Use
                </Button>
              </YStack>
            </XStack>
          </YStack>
        );
      case 'services':
        return (
          <YStack gap={12}>
            {draftServices.map((service, index) => (
              <Surface key={index}>
                <YStack gap={10}>
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text fontSize={14} fontWeight="700">
                      Offer {index + 1}
                    </Text>
                    <IconButton icon={Trash2} label="Remove offer" tone="danger" onPress={() => removeService(index)} />
                  </XStack>
                  <Field
                    label="Name"
                    value={service.name}
                    onChangeText={(name) => updateService(index, { name })}
                    placeholder="Intro call"
                  />
                  <XStack gap={10}>
                    <YStack flex={1}>
                      <Field
                        label="Minutes"
                        value={String(service.durationMinutes)}
                        onChangeText={(value) => updateService(index, { durationMinutes: Number(value) || 0 })}
                        keyboardType="number-pad"
                      />
                    </YStack>
                    <YStack flex={1}>
                      <Field
                        label="Price"
                        value={service.price}
                        onChangeText={(price) => updateService(index, { price })}
                        keyboardType="decimal-pad"
                      />
                    </YStack>
                  </XStack>
                </YStack>
              </Surface>
            ))}
            <Button icon={Plus} variant="secondary" disabled={assistantTyping} onPress={addService}>
              Add offer
            </Button>
            <XStack gap={10}>
              <YStack flex={1}>
                <Button variant="ghost" disabled={assistantTyping} onPress={() => submitAnswer([])}>
                  Skip
                </Button>
              </YStack>
              <YStack flex={1}>
                <Button icon={Check} disabled={assistantTyping} onPress={() => submitAnswer(draftServices)}>
                  Send
                </Button>
              </YStack>
            </XStack>
          </YStack>
        );
      case 'boolean':
        if (nodeId === 'booking') {
          return (
            <YStack gap={10}>
              <ChoiceButton
                label="Yes, booking happens in messages"
                selected={payload.bookingContextEnabled}
                disabled={assistantTyping}
                onPress={() => submitAnswer(true)}
              />
              <ChoiceButton
                label="Not yet, just answer questions"
                selected={!payload.bookingContextEnabled}
                disabled={assistantTyping}
                onPress={() => submitAnswer(false)}
              />
            </YStack>
          );
        }
        return (
          <YStack gap={10}>
            <ChoiceButton
              label="Follow-ups on"
              selected={payload.followUpEnabled}
              disabled={assistantTyping}
              onPress={() => submitAnswer(true)}
            />
            <ChoiceButton
              label="Follow-ups off"
              selected={!payload.followUpEnabled}
              disabled={assistantTyping}
              onPress={() => submitAnswer(false)}
            />
          </YStack>
        );
      case 'availability':
        return (
          <YStack gap={12}>
            <XStack flexWrap="wrap" gap={8}>
              {dayLabels.map((day, index) => (
                <ChoiceButton
                  key={day}
                  label={day}
                  selected={draftAvailability.days.includes(index)}
                  disabled={assistantTyping}
                  onPress={() => toggleDay(index)}
                />
              ))}
            </XStack>
            <XStack gap={10}>
              <YStack flex={1}>
                <Field
                  label="Start"
                  value={draftAvailability.startTime}
                  onChangeText={(startTime) =>
                    setDraftAvailability((current) => ({ ...current, startTime }))
                  }
                />
              </YStack>
              <YStack flex={1}>
                <Field
                  label="End"
                  value={draftAvailability.endTime}
                  onChangeText={(endTime) =>
                    setDraftAvailability((current) => ({ ...current, endTime }))
                  }
                />
              </YStack>
            </XStack>
            <Button icon={Check} disabled={assistantTyping} onPress={() => submitAnswer(draftAvailability)}>
              Send
            </Button>
          </YStack>
        );
      case 'notification':
        return (
          <YStack gap={10}>
            <Surface>
              <YStack gap={6}>
                <XStack alignItems="center" gap={8}>
                  <Bell size={18} color={colors.primary} />
                  <Text fontSize={15} fontWeight="700">
                    Notifications are optional
                  </Text>
                </XStack>
                <Text fontSize={13} color={colors.textSecondary}>
                  {Platform.OS === 'web'
                    ? 'Your browser may ask for permission when you enable them.'
                    : 'Native notification prompts are not available in this setup pass.'}
                </Text>
              </YStack>
            </Surface>
            <Button
              icon={Bell}
              loading={notificationBusy}
              disabled={assistantTyping}
              onPress={requestNotificationPermission}
            >
              Enable notifications
            </Button>
            <Button variant="ghost" disabled={assistantTyping} onPress={() => submitAnswer('skipped')}>
              Skip for now
            </Button>
          </YStack>
        );
      case 'review':
        return (
          <YStack gap={10}>
            {reviewItems.map((item) => (
              <Surface key={item.label}>
                <YStack gap={4}>
                  <Text fontSize={12} fontWeight="700" color={colors.textSecondary}>
                    {item.label}
                  </Text>
                  <Text fontSize={15}>{item.value}</Text>
                </YStack>
              </Surface>
            ))}
          </YStack>
        );
    }
  }

  function isSelectedSingle(reply: string) {
    if (nodeId === 'category') return payload.businessCategory === reply;
    if (nodeId === 'tone') return payload.agentTone === reply;
    if (nodeId === 'approval') return (payload.approvalMode === 'auto_eligible') === reply.startsWith('Auto');
    if (nodeId === 'moderation') return payload.moderationLevel === reply.toLowerCase();
    return false;
  }
}

function ChoiceButton({
  label,
  selected,
  disabled = false,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.surfaceMuted : colors.surface,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
      })}
    >
      <XStack alignItems="center" gap={8}>
        {selected ? <Check size={15} color={colors.primary} /> : null}
        <Text fontSize={14} fontWeight="700" color={selected ? colors.accent : colors.text}>
          {label}
        </Text>
      </XStack>
    </Pressable>
  );
}

function SuggestionRow({ label, value }: { label: string; value: string }) {
  return (
    <YStack
      gap={3}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius={8}
      padding={10}
      backgroundColor={colors.surfaceMuted}
    >
      <Text fontSize={11} fontWeight="700" color={colors.textSecondary}>
        {label}
      </Text>
      <Text fontSize={13}>{value || 'Not suggested'}</Text>
    </YStack>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <XStack alignItems="flex-start" gap={10}>
      <XStack
        width={34}
        height={34}
        borderRadius={8}
        alignItems="center"
        justifyContent="center"
        backgroundColor={colors.surfaceMuted}
      >
        <Bot size={18} color={colors.accent} />
      </XStack>
      <YStack
        flex={1}
        backgroundColor={colors.surface}
        borderColor={colors.border}
        borderWidth={1}
        borderRadius={8}
        padding={14}
      >
        <Text fontSize={15}>{children}</Text>
      </YStack>
    </XStack>
  );
}

function TypingBubble() {
  return (
    <XStack alignItems="flex-start" gap={10}>
      <XStack
        width={34}
        height={34}
        borderRadius={8}
        alignItems="center"
        justifyContent="center"
        backgroundColor={colors.surfaceMuted}
      >
        <Bot size={18} color={colors.accent} />
      </XStack>
      <YStack
        backgroundColor={colors.surface}
        borderColor={colors.border}
        borderWidth={1}
        borderRadius={8}
        paddingHorizontal={14}
        paddingVertical={10}
      >
        <Text fontSize={13} color={colors.textSecondary}>
          Typing...
        </Text>
      </YStack>
    </XStack>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <XStack justifyContent="flex-end">
      <YStack
        backgroundColor={colors.primary}
        borderRadius={8}
        padding={12}
        style={{ maxWidth: '82%' }}
      >
        <Text fontSize={15} fontWeight="700" color={colors.onPrimary}>
          {children}
        </Text>
      </YStack>
    </XStack>
  );
}
