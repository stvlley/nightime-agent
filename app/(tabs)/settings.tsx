import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import {
  Bell,
  ChevronRight,
  CircleHelp as HelpCircle,
  Clock,
  CloudUpload,
  LogOut,
  MessagesSquare,
  QrCode,
  Shield,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react-native';
import { XStack, YStack, Text, Button, ListRow, PageHeader, Screen, Section, Surface, ToggleRow, colors } from '@/components/ui';
import { FeedbackWidget } from '@/components/FeedbackWidget';
import { useAuth } from '@/hooks/useAuth';
import { preferencesService } from '@/lib/preferences';
import { confirmAsync } from '@/utils/confirm';

export default function SettingsScreen() {
  const { user, signOut, isSupabaseConfigured } = useAuth();
  const rootNavigationState = useRootNavigationState();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    let active = true;
    preferencesService
      .get(user.id)
      .then((prefs) => {
        if (!active || !prefs) return;
        setNotificationsEnabled(prefs.notifications_enabled);
        setFollowUpEnabled(prefs.follow_up_enabled);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, isSupabaseConfigured]);

  const savePreference = async (
    patch: { notifications_enabled?: boolean; follow_up_enabled?: boolean },
    revert: () => void
  ) => {
    setPrefsError(null);
    if (!isSupabaseConfigured || !user) return;
    try {
      await preferencesService.update(user.id, patch);
    } catch {
      revert();
      setPrefsError('Could not save the change. Check your connection and try again.');
    }
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    void savePreference({ notifications_enabled: value }, () => setNotificationsEnabled(!value));
  };

  const handleFollowUpToggle = (value: boolean) => {
    setFollowUpEnabled(value);
    void savePreference({ follow_up_enabled: value }, () => setFollowUpEnabled(!value));
  };

  const performSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      if (rootNavigationState?.key) {
        router.replace('/');
      }
    } catch (error: any) {
      setSigningOut(false);
      const message = error?.message ?? 'Please try again.';
      if (Platform.OS === 'web') {
        window.alert(`Sign out failed\n\n${message}`);
      } else {
        setPrefsError(`Sign out failed: ${message}`);
      }
    }
  };

  const handleLogout = async () => {
    const ok = await confirmAsync('Sign out', 'End this provider session?', 'Sign out');
    if (ok) void performSignOut();
  };

  return (
    <Screen>
      <PageHeader title="Settings" subtitle="Provider account and automation controls." />

      <Section title="Account">
        <YStack gap={10}>
          <ListRow
            icon={User}
            title="Profile & business"
            subtitle={user?.profile?.business_name ?? undefined}
            onPress={() => router.push('/(tabs)/profile')}
            badge={<ChevronRight size={20} color={colors.textSecondary} />}
          />
          <ListRow
            icon={MessagesSquare}
            title="Channels"
            subtitle="Where clients can reach your agent."
            onPress={() => router.push('/(tabs)/channels')}
            badge={<ChevronRight size={20} color={colors.textSecondary} />}
          />
          <ListRow
            icon={Sparkles}
            title="Agent settings"
            subtitle="Saved replies, moderation, and automation controls."
            onPress={() => router.push('/(tabs)/ai-settings')}
            badge={<ChevronRight size={20} color={colors.textSecondary} />}
          />
        </YStack>
      </Section>

      <Section title="Business tools">
        <YStack gap={10}>
          <ListRow
            icon={CloudUpload}
            title="Training imports"
            subtitle="Import prior conversations to tune agent replies."
            onPress={() => router.push('/(tabs)/upload')}
            badge={<ChevronRight size={20} color={colors.textSecondary} />}
          />
          <ListRow
            icon={QrCode}
            title="Payment links"
            subtitle="Show clients a scannable card for direct payment."
            onPress={() => router.push('/(tabs)/payments')}
            badge={<ChevronRight size={20} color={colors.textSecondary} />}
          />
          <ListRow
            icon={Wallet}
            title="Plan & billing"
            subtitle="Plan details, early access status, and monthly usage."
            onPress={() => router.push('/(tabs)/billing')}
            badge={<ChevronRight size={20} color={colors.textSecondary} />}
          />
        </YStack>
      </Section>

      <Section title="Automation">
        <YStack gap={10}>
          <ToggleRow
            title="Notify me about messages needing attention"
            subtitle="Drafts waiting for approval and threads the agent hands off."
            icon={Bell}
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
          />
          <ToggleRow
            title="Follow-up automation"
            subtitle="Let the agent nudge clients who go quiet mid-conversation."
            icon={Clock}
            value={followUpEnabled}
            onValueChange={handleFollowUpToggle}
          />
          {prefsError ? (
            <Text fontSize={13} color={colors.danger}>
              {prefsError}
            </Text>
          ) : null}
          {!isSupabaseConfigured ? (
            <Text fontSize={12} color={colors.textMuted}>
              Demo mode — automation preferences are not persisted without Supabase.
            </Text>
          ) : null}
        </YStack>
      </Section>

      <Section title="Support">
        <YStack gap={10}>
          <Surface>
            <XStack alignItems="center" gap={12}>
              <Shield size={20} color={colors.textSecondary} />
              <YStack flex={1} gap={3}>
                <Text fontSize={15} fontWeight="700" color={colors.text}>Privacy</Text>
                <Text fontSize={13} color={colors.textSecondary}>
                  Your conversations stay in your account. Internal labels identify saved replies,
                  drafted replies, and fallbacks for provider review.
                </Text>
              </YStack>
            </XStack>
          </Surface>
          <Surface>
            <XStack alignItems="center" gap={12}>
              <HelpCircle size={20} color={colors.textSecondary} />
              <YStack flex={1} gap={3}>
                <Text fontSize={15} fontWeight="700" color={colors.text}>Help</Text>
                <Text fontSize={13} color={colors.textSecondary}>
                  Stuck? Check Channels for connection guides or Agent Settings for reply and
                  moderation controls.
                </Text>
              </YStack>
            </XStack>
          </Surface>
          <Surface>
            <YStack gap={12}>
              <XStack alignItems="center" gap={12}>
                <HelpCircle size={20} color={colors.primary} />
                <YStack flex={1} gap={3}>
                  <Text fontSize={15} fontWeight="700" color={colors.text}>Feedback</Text>
                  <Text fontSize={13} color={colors.textSecondary}>
                    Send product feedback, bug reports, or support requests from inside the app.
                  </Text>
                </YStack>
              </XStack>
              <FeedbackWidget route="/(tabs)/settings" />
            </YStack>
          </Surface>
        </YStack>
      </Section>

      <Section>
        <Button icon={LogOut} variant="danger" onPress={handleLogout} loading={signingOut}>
          {signingOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </Section>

      <XStack justifyContent="center">
        <Text fontSize={12} color={colors.textMuted}>nitime version 1.0.0</Text>
      </XStack>
    </Screen>
  );
}
