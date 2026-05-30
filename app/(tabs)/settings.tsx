import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import {
  Bell,
  ChevronRight,
  CircleHelp as HelpCircle,
  Clock,
  LogOut,
  Shield,
  SlidersHorizontal,
  Smartphone,
  User,
  Volume2,
  LucideIcon,
} from 'lucide-react-native';
import { XStack, YStack, Text, Button, IconButton, ListRow, PageHeader, Screen, Section, ToggleRow, colors } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

type SettingItem =
  | {
      label: string;
      icon: LucideIcon;
      action: () => void;
      toggle?: false;
    }
  | {
      label: string;
      icon: LucideIcon;
      toggle: true;
      value: boolean;
      onToggle: (value: boolean) => void;
    };

type SettingSection = {
  title: string;
  items: SettingItem[];
};

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const rootNavigationState = useRootNavigationState();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [voiceCallsEnabled, setVoiceCallsEnabled] = useState(true);
  const [autoFollowUp, setAutoFollowUp] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

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
        Alert.alert('Sign out failed', message);
      }
    }
  };

  const handleLogout = () => {
    // React Native Web's Alert.alert with buttons is a no-op, so confirm via the
    // browser dialog on web and the native Alert elsewhere.
    if (Platform.OS === 'web') {
      if (window.confirm('End this provider session?')) {
        void performSignOut();
      }
      return;
    }

    Alert.alert('Sign out', 'End this provider session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void performSignOut() },
    ]);
  };

  const settingSections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        { label: 'Profile information', icon: User, action: () => Alert.alert('Profile', 'Profile editing is not connected yet.') },
        { label: 'Business details', icon: Smartphone, action: () => Alert.alert('Business', 'Business settings are not connected yet.') },
        { label: 'Setup chat', icon: SlidersHorizontal, action: () => router.push('/(onboarding)/setup') },
      ],
    },
    {
      title: 'Automation',
      items: [
        { label: 'Push notifications', icon: Bell, toggle: true, value: notificationsEnabled, onToggle: setNotificationsEnabled },
        { label: 'Voice handling', icon: Volume2, toggle: true, value: voiceCallsEnabled, onToggle: setVoiceCallsEnabled },
        { label: 'Follow-up automation', icon: Clock, toggle: true, value: autoFollowUp, onToggle: setAutoFollowUp },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Privacy policy', icon: Shield, action: () => Alert.alert('Privacy', 'Privacy policy is not connected yet.') },
        { label: 'Help center', icon: HelpCircle, action: () => Alert.alert('Help', 'Help center is not connected yet.') },
      ],
    },
  ];

  return (
    <Screen>
      <PageHeader title="Settings" subtitle="Provider account and automation controls." />

      {settingSections.map((section) => (
        <Section key={section.title} title={section.title}>
          <YStack gap={10}>
            {section.items.map((item) =>
              item.toggle ? (
                <ToggleRow
                  key={item.label}
                  title={item.label}
                  value={item.value}
                  onValueChange={item.onToggle}
                  icon={item.icon}
                />
              ) : (
                <ListRow
                  key={item.label}
                  icon={item.icon}
                  title={item.label}
                  onPress={item.action}
                  badge={<IconButton icon={ChevronRight} label={`${item.label} details`} />}
                />
              )
            )}
          </YStack>
        </Section>
      ))}

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
