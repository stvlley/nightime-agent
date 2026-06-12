import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Code,
  Globe,
  Link as LinkIcon,
  Mail,
  MessageSquare,
  Pause,
  Play,
  Send,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { channelService, ConnectedChannel } from '@/lib/channels';
import {
  buildWebchatEmbed,
  buildWebchatLink,
  functionsBaseFromSupabaseUrl,
} from '@/utils/channelSetup';
import { copyOrShare } from '@/utils/clipboard';
import { confirmAsync } from '@/utils/confirm';
import {
  XStack,
  YStack,
  Badge,
  Button,
  Field,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
  Section,
  Surface,
  Text,
  colors,
} from '@/components/ui';

function statusBadge(channel: ConnectedChannel | undefined) {
  if (!channel) return <Badge tone="neutral">not connected</Badge>;
  return channel.active ? <Badge tone="success">active</Badge> : <Badge tone="warning">paused</Badge>;
}

export default function ChannelsScreen() {
  const { user, isSupabaseConfigured } = useAuth();
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [webchatSlug, setWebchatSlug] = useState<string | null>(user?.profile?.slug ?? null);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramError, setTelegramError] = useState<string | null>(null);

  const byChannel = useMemo(() => {
    const map = new Map<string, ConnectedChannel>();
    for (const c of channels) map.set(c.channel, c);
    return map;
  }, [channels]);

  const webchat = byChannel.get('webchat');
  const telegram = byChannel.get('telegram');

  const load = useCallback(() => {
    if (!isSupabaseConfigured || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    channelService
      .list(user.id)
      .then((rows) => {
        setChannels(rows);
        const wc = rows.find((r) => r.channel === 'webchat');
        if (wc?.externalAccountId) setWebchatSlug(wc.externalAccountId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load channels.'))
      .finally(() => setLoading(false));
  }, [isSupabaseConfigured, user]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3500);
  };

  const webchatLink = useMemo(() => {
    // Visitors are resolved by profiles.slug, so the live profile value wins
    // over whatever was stored on the channel row when it was created.
    const slug = user?.profile?.slug || webchatSlug || webchat?.externalAccountId;
    if (!slug) return null;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    const widgetBase =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/chat.html`
        : 'https://nightime-agent.vercel.app/chat.html';
    return buildWebchatLink({
      widgetBase,
      slug,
      functionsBase: functionsBaseFromSupabaseUrl(supabaseUrl),
      anonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string) ?? '',
      brand: user?.profile?.display_name || user?.profile?.business_name || undefined,
    });
  }, [webchat, webchatSlug, user]);

  const handleEnableWebchat = async () => {
    if (!user) return;
    setBusy('webchat');
    setError(null);
    try {
      const { slug } = await channelService.enableWebchat(user.id, user.email || 'provider');
      setWebchatSlug(slug);
      load();
      flash('Web chat is on. Share the link below with clients.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not enable web chat.');
    } finally {
      setBusy(null);
    }
  };

  const handleConnectTelegram = async () => {
    if (!user) return;
    setBusy('telegram');
    setTelegramError(null);
    try {
      const { username } = await channelService.connectTelegram(user.id, telegramToken);
      setTelegramToken('');
      load();
      flash(`Connected @${username}. Message the bot to test the loop.`);
    } catch (e) {
      setTelegramError(e instanceof Error ? e.message : 'Could not connect the bot.');
    } finally {
      setBusy(null);
    }
  };

  const handleSetActive = async (channel: ConnectedChannel, active: boolean) => {
    setBusy(channel.id);
    setError(null);
    try {
      await channelService.setActive(channel.id, active);
      setChannels((prev) => prev.map((c) => (c.id === channel.id ? { ...c, active } : c)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the channel.');
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async (channel: ConnectedChannel, label: string) => {
    const ok = await confirmAsync(
      `Disconnect ${label}?`,
      'Clients will no longer reach your agent on this channel. You can reconnect later.',
      'Disconnect'
    );
    if (!ok) return;
    setBusy(channel.id);
    setError(null);
    try {
      await channelService.disconnect(channel.id);
      setChannels((prev) => prev.filter((c) => c.id !== channel.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not disconnect the channel.');
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    const result = await copyOrShare(text);
    if (result === 'copied') flash(`${label} copied to clipboard.`);
    else if (result === 'shared') flash(`${label} ready to share.`);
    else flash(`Could not copy automatically — select and copy the ${label.toLowerCase()} text.`);
  };

  const pauseResumeButton = (channel: ConnectedChannel) => (
    <Button
      icon={channel.active ? Pause : Play}
      variant="secondary"
      disabled={busy === channel.id}
      onPress={() => handleSetActive(channel, !channel.active)}
    >
      {channel.active ? 'Pause' : 'Resume'}
    </Button>
  );

  return (
    <Screen>
      <PageHeader
        title="Channels"
        subtitle="Where clients can reach your agent."
        action={<IconButton icon={ArrowLeft} label="Back" onPress={() => router.back()} />}
      />

      {!isSupabaseConfigured ? (
        <Surface tone="info">
          <Text fontSize={13} color={colors.textSecondary}>
            Demo mode — channel connections need a configured Supabase backend. Set
            EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to connect real channels.
          </Text>
        </Surface>
      ) : null}

      {notice ? (
        <Surface tone="success">
          <XStack alignItems="center" gap={8}>
            <Check size={16} color={colors.success} />
            <Text fontSize={13} color={colors.text} flex={1}>
              {notice}
            </Text>
          </XStack>
        </Surface>
      ) : null}

      {error ? (
        <Text fontSize={13} color={colors.danger}>
          {error}
        </Text>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <Section title="Web chat">
            <Surface>
              <YStack gap={12}>
                <XStack alignItems="center" gap={10}>
                  <Globe size={20} color={colors.primary} />
                  <YStack flex={1} gap={2}>
                    <Text fontSize={15} fontWeight="700" color={colors.text}>
                      Shareable chat page
                    </Text>
                    <Text fontSize={13} color={colors.textSecondary}>
                      Zero setup. Clients chat from a link or an embed on your site. AI disclosure
                      is built in.
                    </Text>
                  </YStack>
                  {statusBadge(webchat)}
                </XStack>

                {webchat ? (
                  <YStack gap={10}>
                    {webchatLink ? (
                      <Surface style={{ padding: 12 }}>
                        <Text fontSize={12} color={colors.textSecondary}>
                          {webchatLink}
                        </Text>
                      </Surface>
                    ) : null}
                    <XStack gap={8} flexWrap="wrap">
                      {webchatLink ? (
                        <>
                          <Button
                            icon={LinkIcon}
                            variant="secondary"
                            onPress={() => handleCopy(webchatLink, 'Chat link')}
                          >
                            Copy link
                          </Button>
                          <Button
                            icon={Code}
                            variant="secondary"
                            onPress={() => handleCopy(buildWebchatEmbed(webchatLink), 'Embed code')}
                          >
                            Copy embed code
                          </Button>
                        </>
                      ) : null}
                      {pauseResumeButton(webchat)}
                      <Button
                        icon={Trash2}
                        variant="ghost"
                        disabled={busy === webchat.id}
                        onPress={() => handleDisconnect(webchat, 'web chat')}
                      >
                        Disconnect
                      </Button>
                    </XStack>
                  </YStack>
                ) : (
                  <Button
                    icon={Globe}
                    loading={busy === 'webchat'}
                    disabled={!isSupabaseConfigured || busy === 'webchat'}
                    onPress={handleEnableWebchat}
                  >
                    Turn on web chat
                  </Button>
                )}
              </YStack>
            </Surface>
          </Section>

          <Section title="Telegram">
            <Surface>
              <YStack gap={12}>
                <XStack alignItems="center" gap={10}>
                  <Send size={20} color={colors.info} />
                  <YStack flex={1} gap={2}>
                    <Text fontSize={15} fontWeight="700" color={colors.text}>
                      {telegram?.externalAccountId
                        ? `@${telegram.externalAccountId}`
                        : 'Your own Telegram bot'}
                    </Text>
                    <Text fontSize={13} color={colors.textSecondary}>
                      {telegram
                        ? 'Clients who message this bot reach your agent.'
                        : 'Branded and free — needs a one-time token from Telegram.'}
                    </Text>
                  </YStack>
                  {statusBadge(telegram)}
                </XStack>

                {telegram ? (
                  <XStack gap={8} flexWrap="wrap">
                    {pauseResumeButton(telegram)}
                    <Button
                      icon={Trash2}
                      variant="ghost"
                      disabled={busy === telegram.id}
                      onPress={() => handleDisconnect(telegram, 'Telegram')}
                    >
                      Disconnect
                    </Button>
                  </XStack>
                ) : (
                  <YStack gap={10}>
                    <YStack gap={4}>
                      <Text fontSize={13} color={colors.textSecondary}>
                        1. In Telegram, open @BotFather and send /newbot.
                      </Text>
                      <Text fontSize={13} color={colors.textSecondary}>
                        2. Pick a name and username for your bot.
                      </Text>
                      <Text fontSize={13} color={colors.textSecondary}>
                        3. Paste the token BotFather gives you below.
                      </Text>
                    </YStack>
                    <Field
                      label="Bot token"
                      value={telegramToken}
                      onChangeText={(value) => {
                        setTelegramToken(value);
                        setTelegramError(null);
                      }}
                      placeholder="123456789:AA..."
                    />
                    {telegramError ? (
                      <Text fontSize={13} color={colors.danger}>
                        {telegramError}
                      </Text>
                    ) : null}
                    <Button
                      icon={Send}
                      loading={busy === 'telegram'}
                      disabled={!isSupabaseConfigured || !telegramToken.trim() || busy === 'telegram'}
                      onPress={handleConnectTelegram}
                    >
                      Connect bot
                    </Button>
                  </YStack>
                )}
              </YStack>
            </Surface>
          </Section>

          <Section title="More channels">
            <YStack gap={10}>
              {(
                [
                  {
                    key: 'whatsapp',
                    label: 'WhatsApp',
                    icon: MessageSquare,
                    note: 'Runs on the Meta WhatsApp Cloud API. Connection needs Meta business credentials and is currently set up with our help.',
                  },
                  {
                    key: 'gv',
                    label: 'Google Voice',
                    icon: Mail,
                    note: 'Texts arrive via Gmail notifications. Connection needs Google Cloud credentials and is currently set up with our help.',
                  },
                ] as const
              ).map(({ key, label, icon: Icon, note }) => {
                const row = byChannel.get(key);
                return (
                  <Surface key={key}>
                    <YStack gap={10}>
                      <XStack alignItems="center" gap={10}>
                        <Icon size={20} color={colors.textSecondary} />
                        <YStack flex={1} gap={2}>
                          <Text fontSize={15} fontWeight="700" color={colors.text}>
                            {label}
                            {row?.externalAccountId ? ` — ${row.externalAccountId}` : ''}
                          </Text>
                          <Text fontSize={13} color={colors.textSecondary}>
                            {row ? 'Clients on this channel reach your agent.' : note}
                          </Text>
                        </YStack>
                        {row ? statusBadge(row) : <Badge tone="info">assisted setup</Badge>}
                      </XStack>
                      {row ? <XStack gap={8}>{pauseResumeButton(row)}</XStack> : null}
                    </YStack>
                  </Surface>
                );
              })}
            </YStack>
          </Section>

          <Text fontSize={12} color={colors.textMuted}>
            Every channel runs the same loop: saved responses answer common questions for free, the
            AI drafts the rest, and anything not confidently matched waits for your approval in the
            Inbox.
          </Text>
        </>
      )}
    </Screen>
  );
}
