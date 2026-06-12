import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import {
  Bell,
  ChevronRight,
  CircleHelp as HelpCircle,
  Clock,
  LogOut,
  MessagesSquare,
  Shield,
  SlidersHorizontal,
  User,
} from 'lucide-react-native';
import { XStack, YStack, Text, Button, IconButton, ListRow, PageHeader, Screen, Section, Surface, ToggleRow, colors } from '@/components/ui';
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
            badge={<IconButton icon={ChevronRight} label="Edit profile" onPress={() => router.push('/(tabs)/profile')} />}
          />
          <ListRow
            icon={MessagesSquare}
            title="Channels"
            subtitle="Where clients can reach your agent."
            onPress={() => router.push('/(tabs)/channels')}
            badge={<IconButton icon={ChevronRight} label="Manage channels" onPress={() => router.push('/(tabs)/channels')} />}
          />
          <ListRow
            icon={SlidersHorizontal}
            title="Setup chat"
            subtitle="Re-run the guided assistant setup."
            onPress={() => router.push('/(onboarding)/setup')}
            badge={<IconButton icon={ChevronRight} label="Open setup chat" onPress={() => router.push('/(onboarding)/setup')} />}
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
                  Your conversations stay in your account. AI replies are always disclosed to
                  clients on the web chat surface. A full privacy policy ships with launch.
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
                  Stuck? Re-run the setup chat above, or check the Channels screen for
                  step-by-step connection guides.
                </Text>
              </YStack>
            </XStack>
          </Surface>
        </YStack>
      </Section>

      <Section>
        <Button icon={LogOut} variant="danger" onPress={handleLogout} loading={signingOut}>
          {signingOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </Section>

      <XStack justifyContent="center">
        <Text fontSize={12} color={colors.textMuted}>Nightime Agent version 1.0.0</Text>
      </XStack>
    </Screen>
  );
}
