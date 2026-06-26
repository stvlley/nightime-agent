import React, { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Send, X } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { threadService, draftService, ThreadDetail, ThreadMessageItem } from '@/lib/data';
import {
  XStack,
  YStack,
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
  Section,
  Text,
  colors,
} from '@/components/ui';

// Placeholder transcripts for demo mode (no Supabase). Ids match the demo
// conversations in the Inbox.
const DEMO_THREADS: Record<string, ThreadDetail> = {
  '1': {
    id: '1',
    clientHandle: 'Alex Client',
    channel: 'whatsapp',
    state: 'confirmed',
    messages: [
      { id: 'd1', text: 'Hey, do you have anything open this week?', direction: 'in', createdAt: null, aiGenerated: false, approvalStatus: null, source: null, intent: null, confidence: null },
      { id: 'd2', text: 'Thursday at 2 PM is open. Want me to hold it?', direction: 'out', createdAt: null, aiGenerated: true, approvalStatus: 'sent', source: 'faq', intent: 'availability', confidence: 0.92 },
      { id: 'd3', text: 'Thanks, that time works for me.', direction: 'in', createdAt: null, aiGenerated: false, approvalStatus: null, source: null, intent: null, confidence: null },
    ],
  },
  '2': {
    id: '2',
    clientHandle: 'Mia Client',
    channel: 'telegram',
    state: 'offering',
    messages: [
      { id: 'd4', text: 'Is tomorrow afternoon possible?', direction: 'in', createdAt: null, aiGenerated: false, approvalStatus: null, source: null, intent: null, confidence: null },
      { id: 'd5', text: 'Tomorrow at 3 PM is open. Should I hold it?', direction: 'out', createdAt: null, aiGenerated: true, approvalStatus: 'pending', source: 'llm', intent: 'availability', confidence: 0.71 },
    ],
  },
  '3': {
    id: '3',
    clientHandle: 'Sam Rivera',
    channel: 'email',
    state: 'confirmed',
    messages: [
      { id: 'd6', text: 'Booking confirmed for Thursday at 2 PM.', direction: 'out', createdAt: null, aiGenerated: false, approvalStatus: 'sent', source: null, intent: null, confidence: null },
    ],
  },
};

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MessageBubble({
  message,
  busy,
  onApprove,
  onReject,
}: {
  message: ThreadMessageItem;
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const outbound = message.direction === 'out';
  const pending = outbound && message.approvalStatus === 'pending';
  const rejected = outbound && message.approvalStatus === 'rejected';
  const failed = outbound && message.approvalStatus === 'failed';
  const needsReview = pending || failed;

  const sourceLabel =
    message.source === 'faq' ? 'saved reply' : message.source === 'llm' ? 'AI' : message.source;
  const bubbleBackground = needsReview ? '#fffaf1' : outbound ? colors.primary : colors.surface;
  const bubbleBorder = needsReview ? '#d7b56f' : colors.border;
  const messageColor = needsReview || !outbound ? colors.text : colors.onPrimary;
  const metaColor = needsReview || !outbound ? colors.textMuted : 'rgba(255,255,255,0.72)';

  return (
    <XStack justifyContent={outbound ? 'flex-end' : 'flex-start'}>
      <YStack
        gap={needsReview ? 10 : 6}
        padding={needsReview ? 14 : 12}
        borderRadius={needsReview ? 14 : 10}
        borderWidth={1}
        borderColor={bubbleBorder}
        backgroundColor={bubbleBackground}
        style={{
          maxWidth: needsReview ? '92%' : '85%',
          opacity: rejected ? 0.55 : 1,
          shadowColor: needsReview ? '#8f6a18' : 'transparent',
          shadowOpacity: needsReview ? 0.12 : 0,
          shadowRadius: needsReview ? 14 : 0,
          shadowOffset: { width: 0, height: 7 },
          elevation: needsReview ? 2 : 0,
        }}
      >
        {needsReview ? (
          <XStack justifyContent="space-between" alignItems="center" gap={12}>
            <Text fontSize={12} fontWeight="800" color={colors.warning}>
              Draft ready for review
            </Text>
            {pending ? <Badge tone="warning">awaiting approval</Badge> : null}
            {failed ? <Badge tone="danger">delivery failed</Badge> : null}
          </XStack>
        ) : null}

        <Text fontSize={14} color={messageColor} style={{ lineHeight: 20 }}>
          {message.text}
        </Text>

        <XStack gap={6} flexWrap="wrap" alignItems="center">
          {message.createdAt ? (
            <Text fontSize={11} color={metaColor}>
              {formatTime(message.createdAt)}
            </Text>
          ) : null}
          {message.aiGenerated && sourceLabel ? <Badge tone="info">{sourceLabel}</Badge> : null}
          {!message.aiGenerated && outbound ? <Badge tone="neutral">you</Badge> : null}
          {message.approvalStatus === 'auto_sent' ? <Badge tone="success">auto-sent</Badge> : null}
          {pending && !needsReview ? <Badge tone="warning">awaiting approval</Badge> : null}
          {rejected ? <Badge tone="neutral">rejected</Badge> : null}
          {failed && !needsReview ? <Badge tone="danger">delivery failed</Badge> : null}
        </XStack>

        {needsReview ? (
          <XStack gap={10} marginTop={2} flexWrap="wrap" alignItems="center">
            <YStack style={{ minWidth: 172 }}>
              <Button icon={Check} loading={busy} disabled={busy} onPress={() => onApprove(message.id)}>
                {failed ? 'Retry send' : 'Approve & send'}
              </Button>
            </YStack>
            {pending ? (
              <Button icon={X} variant="ghost" disabled={busy} onPress={() => onReject(message.id)}>
                Reject
              </Button>
            ) : null}
          </XStack>
        ) : null}
      </YStack>
    </XStack>
  );
}

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, isSupabaseConfigured } = useAuth();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured) {
      setThread(DEMO_THREADS[id] ?? null);
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);
    threadService
      .getDetail(user.id, id)
      .then(setThread)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the conversation.'))
      .finally(() => setLoading(false));
  }, [id, user, isSupabaseConfigured]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (messageId: string) => {
    setBusyId(messageId);
    setError(null);
    try {
      if (isSupabaseConfigured) {
        await draftService.approveAndSend(messageId);
      }
      setThread((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === messageId ? { ...m, approvalStatus: 'sent' } : m
              ),
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reply. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (messageId: string) => {
    setBusyId(messageId);
    setError(null);
    try {
      if (isSupabaseConfigured) {
        await draftService.reject(messageId);
      }
      setThread((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === messageId ? { ...m, approvalStatus: 'rejected' } : m
              ),
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reject the draft. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSend = async () => {
    const text = reply.trim();
    if (!text || !thread) return;
    setSending(true);
    setError(null);
    try {
      if (isSupabaseConfigured && user) {
        await threadService.sendManualReply(user.id, thread.id, text);
        setReply('');
        load();
      } else {
        // Demo mode: append locally so the flow is explorable.
        setThread((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    id: `local-${Date.now()}`,
                    text,
                    direction: 'out',
                    createdAt: new Date().toISOString(),
                    aiGenerated: false,
                    approvalStatus: 'sent',
                    source: null,
                    intent: null,
                    confidence: null,
                  },
                ],
              }
            : prev
        );
        setReply('');
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} The reply is saved in your approval queue — approve it from the Inbox to retry.`
          : 'Could not send the reply.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <PageHeader
        title={thread?.clientHandle ?? 'Conversation'}
        subtitle={thread ? undefined : 'Loading conversation'}
        action={<IconButton icon={ArrowLeft} label="Back to inbox" onPress={() => router.back()} />}
      />

      {thread ? (
        <XStack gap={6} flexWrap="wrap">
          <Badge>{thread.channel}</Badge>
          <Badge tone="info">{thread.state}</Badge>
        </XStack>
      ) : null}

      {error ? (
        <Text fontSize={13} color={colors.danger}>
          {error}
        </Text>
      ) : null}

      {loading ? (
        <LoadingState variant="messages" rows={4} />
      ) : !thread ? (
        <EmptyState
          title="Conversation not found"
          message="It may have been removed, or the link is out of date."
        />
      ) : (
        <>
          <YStack gap={10}>
            {thread.messages.length === 0 ? (
              <EmptyState title="No messages yet" message="Client messages will appear here." />
            ) : (
              thread.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  busy={busyId === message.id}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </YStack>

          <Section title="Reply as yourself">
            <YStack gap={10}>
              <Field
                value={reply}
                onChangeText={setReply}
                placeholder={`Message ${thread.clientHandle}`}
                multiline
              />
              <XStack justifyContent="flex-end">
                <Button
                  icon={Send}
                  loading={sending}
                  disabled={sending || !reply.trim()}
                  onPress={handleSend}
                >
                  Send reply
                </Button>
              </XStack>
              <Text fontSize={12} color={colors.textMuted}>
                Sent through {thread.channel} as your own reply — the agent stays out of it.
              </Text>
            </YStack>
          </Section>
        </>
      )}
    </Screen>
  );
}
