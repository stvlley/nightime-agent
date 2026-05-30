import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Mail, MessageSquare, Smartphone, TrendingUp, Users, Bot } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { statsService, DashboardStats } from '@/lib/data';
import {
  XStack,
  YStack,
  Text,
  Badge,
  Button,
  ListRow,
  PageHeader,
  Screen,
  Section,
  StatBlock,
  ToggleRow,
  colors,
} from '@/components/ui';

const DEMO_STATS: DashboardStats = {
  messagesToday: 47,
  bookingsThisWeek: 12,
  aiResponsesToday: 31,
  responseRate: 94,
};

export default function HomeScreen() {
  const { user, isSupabaseConfigured } = useAuth();
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(
    isSupabaseConfigured
      ? { messagesToday: 0, bookingsThisWeek: 0, aiResponsesToday: 0, responseRate: 0 }
      : DEMO_STATS
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    let active = true;
    statsService
      .getDashboardStats(user.id)
      .then((nextStats) => {
        if (active) setStats(nextStats);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, isSupabaseConfigured]);

  const providerName =
    (isSupabaseConfigured && user?.profile?.business_name) ||
    user?.profile?.display_name ||
    'Provider';

  const connectedPlatforms = [
    { name: 'Google Voice', status: 'connected', icon: Smartphone },
    { name: 'WhatsApp', status: 'connected', icon: MessageSquare },
    { name: 'Email', status: 'connected', icon: Mail },
    { name: 'Telegram', status: 'setup required', icon: MessageSquare },
  ];

  return (
    <Screen>
      <PageHeader title="Dashboard" subtitle={`${providerName} operations overview`} />

      <ToggleRow
        title="Agent responses"
        subtitle={agentEnabled ? 'Nightime Agent is handling eligible client replies.' : 'Client replies require manual review.'}
        value={agentEnabled}
        onValueChange={setAgentEnabled}
        icon={Bot}
      />

      <Section title="Today">
        <XStack flexWrap="wrap" gap={12}>
          <YStack flex={1} minWidth={150}>
            <StatBlock label="Messages" value={String(stats.messagesToday)} icon={MessageSquare} tone="success" />
          </YStack>
          <YStack flex={1} minWidth={150}>
            <StatBlock label="Bookings this week" value={String(stats.bookingsThisWeek)} icon={Calendar} tone="info" />
          </YStack>
          <YStack flex={1} minWidth={150}>
            <StatBlock label="Agent replies" value={String(stats.aiResponsesToday)} icon={Bot} tone="primary" />
          </YStack>
          <YStack flex={1} minWidth={150}>
            <StatBlock label="Response rate" value={`${stats.responseRate}%`} icon={TrendingUp} tone="warning" />
          </YStack>
        </XStack>
      </Section>

      <Section title="Channels">
        <YStack gap={10}>
          {connectedPlatforms.map((platform) => (
            <ListRow
              key={platform.name}
              icon={platform.icon}
              title={platform.name}
              subtitle={platform.status === 'connected' ? 'Ready for inbound client messages.' : 'Connection is not configured yet.'}
              badge={<Badge tone={platform.status === 'connected' ? 'success' : 'warning'}>{platform.status}</Badge>}
            />
          ))}
        </YStack>
      </Section>

      <Section title="Quick actions">
        <XStack flexWrap="wrap" gap={10}>
          <Button icon={Clock} variant="secondary">Set availability</Button>
          <Button icon={Users} variant="secondary">Review clients</Button>
        </XStack>
        <Text fontSize={12} color={colors.textMuted}>
          These actions are placeholders until the scheduling and client profile workflows are connected.
        </Text>
      </Section>
    </Screen>
  );
}
