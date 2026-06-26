import React, { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  Calendar,
  Globe,
  Mail,
  MessageSquare,
  MessagesSquare,
  Plus,
  Send,
  Smartphone,
  Sparkles,
  TrendingUp,
  Bot,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { statsService, draftService, DashboardStats } from '@/lib/data';
import { channelService, ConnectedChannel } from '@/lib/channels';
import { preferencesService } from '@/lib/preferences';
import { channelLabel } from '@/utils/channelSetup';
import {
  XStack,
  YStack,
  Text,
  Badge,
  Button,
  ListRow,
  LoadingState,
  PageHeader,
  Screen,
  Section,
  StatBlock,
  Surface,
  ToggleRow,
  colors,
} from '@/components/ui';

// Demo mode (no Supabase) shows illustrative numbers so the dashboard is
// explorable; live mode always starts from real zeros.
const DEMO_STATS: DashboardStats = {
  messagesToday: 47,
  bookingsThisWeek: 12,
  aiResponsesToday: 31,
  responseRate: 94,
};

const CHANNEL_ICONS: Record<string, typeof Globe> = {
  webchat: Globe,
  telegram: Send,
  whatsapp: MessageSquare,
  gv: Smartphone,
  email: Mail,
  sms: MessagesSquare,
};

export default function HomeScreen() {
  const { user, isSupabaseConfigured } = useAuth();
  const [autoSend, setAutoSend] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(
    isSupabaseConfigured
      ? { messagesToday: 0, bookingsThisWeek: 0, aiResponsesToday: 0, responseRate: 0 }
      : DEMO_STATS
  );
  const [statsLoaded, setStatsLoaded] = useState(!isSupabaseConfigured);
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [channelsLoaded, setChannelsLoaded] = useState(!isSupabaseConfigured);
  const [pendingCount, setPendingCount] = useState(0);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!isSupabaseConfigured || !user) return;
    setStatsLoaded(false);
    statsService
      .getDashboardStats(user.id)
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoaded(true));
    channelService
      .list(user.id)
      .then(setChannels)
      .catch(() => {})
      .finally(() => setChannelsLoaded(true));
    draftService.countPending(user.id).then(setPendingCount).catch(() => {});
    preferencesService
      .get(user.id)
      .then((prefs) => {
        if (prefs) setAutoSend(prefs.approval_mode === 'auto_eligible');
      })
      .catch(() => {});
  }, [user, isSupabaseConfigured]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAutoSendToggle = async (value: boolean) => {
    setAutoSend(value);
    setToggleError(null);
    if (!isSupabaseConfigured || !user) return;
    try {
      await preferencesService.update(user.id, {
        approval_mode: value ? 'auto_eligible' : 'manual',
      });
    } catch {
      setAutoSend(!value);
      setToggleError('Could not save the change. Check your connection and try again.');
    }
  };

  const providerName =
    (isSupabaseConfigured && user?.profile?.business_name) ||
    user?.profile?.display_name ||
    'Provider';

  const activeChannels = channels.filter((c) => c.active);

  return (
    <Screen>
      <PageHeader title="Dashboard" subtitle={`${providerName} operations overview`} />

      <YStack gap={6}>
        <ToggleRow
          title="Auto-send confident replies"
          subtitle={
            autoSend
              ? 'Saved responses and eligible drafted replies can send according to your Agent Settings level.'
              : 'Every reply waits in the Inbox for your approval before it is sent.'
          }
          value={autoSend}
          onValueChange={handleAutoSendToggle}
          icon={Bot}
        />
        {toggleError ? (
          <Text fontSize={12} color={colors.danger}>
            {toggleError}
          </Text>
        ) : null}
      </YStack>

      {pendingCount > 0 ? (
        <Surface tone="warning" pressable onPress={() => router.push('/(tabs)/inbox')}>
          <XStack alignItems="center" gap={12}>
            <YStack flex={1} gap={2}>
              <Text fontSize={15} fontWeight="700" color={colors.text}>
                {pendingCount} {pendingCount === 1 ? 'reply needs' : 'replies need'} your approval
              </Text>
              <Text fontSize={13} color={colors.textSecondary}>
                Clients are waiting — review drafts in the Inbox.
              </Text>
            </YStack>
            <XStack
              width={38}
              height={38}
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
              backgroundColor={colors.warningBg}
              borderColor={colors.borderStrong}
              borderWidth={1}
            >
              <ChevronRight size={18} color={colors.warning} />
            </XStack>
          </XStack>
        </Surface>
      ) : null}

      <Section title="Today">
        {!statsLoaded ? (
          <LoadingState variant="stats" rows={4} />
        ) : (
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
        )}
        {!isSupabaseConfigured ? (
          <Text fontSize={12} color={colors.textMuted}>
            Demo data — connect Supabase to see live numbers.
          </Text>
        ) : null}
      </Section>

      <Section
        title="Channels"
        action={
          <Button icon={Plus} variant="secondary" onPress={() => router.push('/(tabs)/channels')}>
            Manage
          </Button>
        }
      >
        {!channelsLoaded ? (
          <LoadingState rows={2} />
        ) : channels.length === 0 ? (
          <Surface>
            <YStack gap={10} alignItems="center" paddingVertical={10}>
              <Text fontSize={15} fontWeight="700" color={colors.text}>
                No channels connected yet
              </Text>
              <Text fontSize={13} color={colors.textSecondary} textAlign="center">
                Connect a channel so clients can reach your agent. Web chat takes one tap.
              </Text>
              <Button icon={Plus} onPress={() => router.push('/(tabs)/channels')}>
                Connect a channel
              </Button>
            </YStack>
          </Surface>
        ) : (
          <YStack gap={10}>
            {channels.map((channel) => {
              const Icon = CHANNEL_ICONS[channel.channel] ?? MessageSquare;
              return (
                <ListRow
                  key={channel.id}
                  icon={Icon}
                  title={channelLabel(channel.channel)}
                  subtitle={
                    channel.active
                      ? 'Ready for inbound client messages.'
                      : 'Paused — inbound messages are ignored.'
                  }
                  onPress={() => router.push('/(tabs)/channels')}
                  badge={
                    <Badge tone={channel.active ? 'success' : 'warning'}>
                      {channel.active ? 'active' : 'paused'}
                    </Badge>
                  }
                />
              );
            })}
            {activeChannels.length === 0 ? (
              <Text fontSize={12} color={colors.textMuted}>
                All channels are paused — clients cannot reach your agent right now.
              </Text>
            ) : null}
          </YStack>
        )}
      </Section>

      <Section title="Quick actions">
        <XStack flexWrap="wrap" gap={10}>
          <Button icon={Sparkles} variant="secondary" onPress={() => router.push('/(tabs)/ai-settings')}>
            Saved responses
          </Button>
          <Button icon={MessagesSquare} variant="secondary" onPress={() => router.push('/(tabs)/inbox')}>
            Open inbox
          </Button>
          <Button icon={Plus} variant="secondary" onPress={() => router.push('/(tabs)/channels')}>
            Connect channels
          </Button>
        </XStack>
      </Section>
    </Screen>
  );
}
