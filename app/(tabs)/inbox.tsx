import React, { useEffect, useState } from 'react';
import { Calendar, Phone, User, Bot } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { threadService } from '@/lib/data';
import { XStack, YStack, Badge, EmptyState, Field, ListRow, LoadingState, PageHeader, Screen, Section } from '@/components/ui';

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
    lastMessage: 'Nightime Agent: Tomorrow at 3 PM is open. Should I hold it?',
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

export default function InboxScreen() {
  const { user, isSupabaseConfigured } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<InboxItem[]>(
    isSupabaseConfigured ? [] : DEMO_CONVERSATIONS
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
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
  }, [user, isSupabaseConfigured]);

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

      <Section title="Conversations">
        {loading ? (
          <LoadingState />
        ) : filteredConversations.length === 0 ? (
          <EmptyState title="No conversations" message="New client messages will appear here." />
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
