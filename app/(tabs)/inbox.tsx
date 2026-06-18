import React, { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Calendar, Phone, User, Bot, Check, X } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { threadService, draftService, PendingDraft } from '@/lib/data';
import {
  XStack,
  YStack,
  Badge,
  Button,
  EmptyState,
  Field,
  ListRow,
  LoadingState,
  PageHeader,
  Screen,
  Section,
  Surface,
  Text,
  colors,
} from '@/components/ui';

interface InboxItem {
  id: string;
  clientName: string;
  lastMessage: string;
  timestamp: string;
  type: 'ai' | 'manual' | 'booking' | 'voice';
  platform: string;
  unread: boolean;
}

const DEMO_CONVERSATIONS: InboxItem[] = [
  {
    id: '1',
    clientName: 'Alex Client',
    lastMessage: 'Thanks, that time works for me.',
    timestamp: '2 min ago',
    type: 'manual',
    platform: 'whatsapp',
    unread: false,
  },
  {
    id: '2',
    clientName: 'Mia Client',
    lastMessage: 'Nitime: Tomorrow at 3 PM is open. Should I hold it?',
    timestamp: '15 min ago',
    type: 'ai',
    platform: 'telegram',
    unread: true,
  },
  {
    id: '3',
    clientName: 'Sam Rivera',
    lastMessage: 'Booking confirmed for Thursday at 2 PM.',
    timestamp: '1 hour ago',
    type: 'booking',
    platform: 'email',
    unread: false,
  },
];

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const d = Math.round(hr / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

function iconForType(type: InboxItem['type']) {
  if (type === 'ai') return Bot;
  if (type === 'booking') return Calendar;
  if (type === 'voice') return Phone;
  return User;
}

function DraftCard({
  draft,
  busy,
  onApprove,
  onReject,
}: {
  draft: PendingDraft;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const sourceLabel = draft.source === 'faq' ? 'FAQ' : draft.source === 'llm' ? 'AI' : 'fallback';
  return (
    <Surface tone="warning">
      <YStack gap={10}>
        <XStack justifyContent="space-between" alignItems="center" gap={8}>
          <Text fontSize={14} fontWeight="700" color={colors.text}>
            {draft.clientHandle}
          </Text>
          <XStack gap={6} flexWrap="wrap">
            {draft.intent ? <Badge tone="info">{draft.intent}</Badge> : null}
            <Badge tone="neutral">{sourceLabel}</Badge>
            <Badge>{draft.channel}</Badge>
          </XStack>
        </XStack>

        {draft.inboundText ? (
          <Text fontSize={13} color={colors.textMuted} numberOfLines={3}>
            Client: {draft.inboundText}
          </Text>
        ) : null}

        <Surface>
          <Text fontSize={14} color={colors.text}>
            {draft.draftText}
          </Text>
        </Surface>

        <XStack gap={10}>
          <YStack flex={1}>
            <Button icon={Check} onPress={onApprove} loading={busy} disabled={busy}>
              Approve & send
            </Button>
          </YStack>
          <Button icon={X} variant="secondary" onPress={onReject} disabled={busy}>
            Reject
          </Button>
        </XStack>
      </YStack>
    </Surface>
  );
}

export default function InboxScreen() {
  const { user, isSupabaseConfigured } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<InboxItem[]>(
    isSupabaseConfigured ? [] : DEMO_CONVERSATIONS
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [drafts, setDrafts] = useState<PendingDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(isSupabaseConfigured);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const loadDrafts = useCallback(() => {
    if (!isSupabaseConfigured || !user) return;
    setDraftsLoading(true);
    draftService
      .listPending(user.id)
      .then(setDrafts)
      .catch(() => {})
      .finally(() => setDraftsLoading(false));
  }, [isSupabaseConfigured, user]);

  // Reload whenever the tab regains focus so approvals done from a thread
  // screen (or new agent drafts) are reflected without a manual refresh.
  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [loadDrafts])
  );

  const handleApprove = useCallback(
    async (id: string) => {
      setBusyId(id);
      setDraftError(null);
      try {
        await draftService.approveAndSend(id);
        setDrafts((prev) => prev.filter((d) => d.id !== id));
      } catch (e) {
        setDraftError(e instanceof Error ? e.message : 'Could not send the reply. Try again.');
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  const handleReject = useCallback(async (id: string) => {
    setBusyId(id);
    setDraftError(null);
    try {
      await draftService.reject(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'Could not reject the draft. Try again.');
    } finally {
      setBusyId(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isSupabaseConfigured || !user) return;
      let active = true;
      setLoading(true);
      threadService
        .listForInbox(user.id)
        .then((rows) => {
          if (!active) return;
          setConversations(
            rows.map((thread) => ({
              id: thread.id,
              clientName: thread.clientHandle,
              lastMessage: thread.lastMessage,
              timestamp: relativeTime(thread.lastActivityAt),
              type: thread.kind,
              platform: thread.channel,
              unread: thread.unread,
            }))
          );
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [user, isSupabaseConfigured])
  );

  const filteredConversations = conversations.filter((conversation) => {
    const query = searchQuery.toLowerCase();
    return (
      conversation.clientName.toLowerCase().includes(query) ||
      conversation.lastMessage.toLowerCase().includes(query)
    );
  });

  return (
    <Screen>
      <PageHeader title="Inbox" subtitle="Review client conversations and agent activity." />
      <Field
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search conversations"
      />

      {isSupabaseConfigured && (draftsLoading || drafts.length > 0) ? (
        <Section title={`Needs your approval${drafts.length ? ` (${drafts.length})` : ''}`}>
          {draftsLoading ? (
            <LoadingState />
          ) : (
            <YStack gap={10}>
              {draftError ? (
                <Text fontSize={13} color={colors.danger}>
                  {draftError}
                </Text>
              ) : null}
              {drafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  busy={busyId === draft.id}
                  onApprove={() => handleApprove(draft.id)}
                  onReject={() => handleReject(draft.id)}
                />
              ))}
            </YStack>
          )}
        </Section>
      ) : null}

      <Section title="Conversations">
        {loading ? (
          <LoadingState />
        ) : filteredConversations.length === 0 ? (
          conversations.length === 0 ? (
            <YStack gap={10}>
              <EmptyState
                title="No conversations yet"
                message="When clients message one of your connected channels, threads appear here."
              />
              <Button variant="secondary" onPress={() => router.push('/(tabs)/channels')}>
                Connect a channel
              </Button>
            </YStack>
          ) : (
            <EmptyState title="No matches" message="No conversations match your search." />
          )
        ) : (
          <YStack gap={10}>
            {filteredConversations.map((conversation) => {
              const Icon = iconForType(conversation.type);
              return (
                <ListRow
                  key={conversation.id}
                  icon={Icon}
                  title={conversation.clientName}
                  subtitle={conversation.lastMessage}
                  meta={conversation.timestamp}
                  onPress={() =>
                    router.push({ pathname: '/(tabs)/thread', params: { id: conversation.id } })
                  }
                  badge={
                    <XStack gap={6} flexWrap="wrap">
                      <Badge tone={conversation.unread ? 'primary' : 'neutral'}>
                        {conversation.unread ? 'unread' : 'read'}
                      </Badge>
                      <Badge tone={conversation.type === 'ai' ? 'success' : conversation.type === 'booking' ? 'info' : 'neutral'}>
                        {conversation.type}
                      </Badge>
                      <Badge>{conversation.platform}</Badge>
                    </XStack>
                  }
                />
              );
            })}
          </YStack>
        )}
      </Section>
    </Screen>
  );
}
