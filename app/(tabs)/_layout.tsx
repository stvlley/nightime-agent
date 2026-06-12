import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Inbox, CalendarDays, Settings2, CloudUpload, Wallet, Sparkles } from 'lucide-react-native';
import { colors } from '@/components/ui';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/hooks/useAuth';
import { draftService } from '@/lib/data';

const PENDING_POLL_MS = 30000;

/** Pending approval-queue size, refreshed on an interval, for the Inbox badge. */
function usePendingDraftCount(): number {
  const { user, isSupabaseConfigured } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    let active = true;
    const refresh = () => {
      draftService
        .countPending(user.id)
        .then((n) => {
          if (active) setCount(n);
        })
        .catch(() => {});
    };
    refresh();
    const timer = setInterval(refresh, PENDING_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user, isSupabaseConfigured]);

  return count;
}

export default function TabLayout() {
  const pendingCount = usePendingDraftCount();

  // Gate the provider workspace behind an authenticated session (shared with the
  // onboarding group via <AuthGate>). Unauthenticated deep-links bounce to `/`.
  return (
    <AuthGate>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.warning, color: colors.onPrimary },
          tabBarIcon: ({ size, color }) => (
            <Inbox size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ size, color }) => (
            <CalendarDays size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-settings"
        options={{
          title: 'AI Settings',
          tabBarIcon: ({ size, color }) => (
            <Sparkles size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarIcon: ({ size, color }) => (
            <CloudUpload size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Billing',
          tabBarIcon: ({ size, color }) => (
            <Wallet size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <Settings2 size={size} color={color} />
          ),
        }}
      />
      {/* Detail screens reachable from rows, not from the tab bar. */}
      <Tabs.Screen name="channels" options={{ href: null }} />
      <Tabs.Screen name="thread" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
    </AuthGate>
  );
}
