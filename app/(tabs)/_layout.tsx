import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router, Tabs } from 'expo-router';
import { CalendarDays, Home, Inbox, Settings2 } from 'lucide-react-native';
import { colors } from '@/components/ui';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/hooks/useAuth';
import { draftService } from '@/lib/data';
import { hasSubscriptionEntitlement } from '@/lib/subscriptions';
import { onboardingUtils } from '@/utils/onboarding';

const PENDING_POLL_MS = 30000;
const VISIBLE_TABS = ['dashboard', 'inbox', 'calendar', 'settings'] as const;
const SECONDARY_PARENT: Record<string, (typeof VISIBLE_TABS)[number]> = {
  'ai-settings': 'settings',
  billing: 'settings',
  channels: 'settings',
  payments: 'settings',
  profile: 'settings',
  thread: 'inbox',
  upload: 'settings',
};
const TAB_ICONS = {
  dashboard: Home,
  inbox: Inbox,
  calendar: CalendarDays,
  settings: Settings2,
};
const HOME_OPTIONS = { title: 'Home' };
const CALENDAR_OPTIONS = { title: 'Calendar' };
const SETTINGS_OPTIONS = { title: 'More' };
const HIDDEN_ROUTE_OPTIONS = { href: null };

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
  // Gate the provider workspace behind an authenticated session (shared with the
  // onboarding group via <AuthGate>). Unauthenticated deep-links bounce to `/`.
  return (
    <AuthGate>
      <WorkspaceTabs />
    </AuthGate>
  );
}

function WorkspaceTabs() {
  const { user } = useAuth();
  const userId = user?.id;
  const pendingCount = usePendingDraftCount();
  const renderTabBar = useCallback((props: BottomTabBarProps) => <ProviderTabBar {...props} />, []);
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
    }),
    []
  );
  const inboxOptions = useMemo(
    () => ({
      title: 'Inbox',
      tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
    }),
    [pendingCount]
  );
  const [accessState, setAccessState] = useState<{
    onboardingCompleted: boolean;
    subscriptionEntitled: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      onboardingUtils.isOnboardingCompleted(),
      userId ? hasSubscriptionEntitlement(userId) : Promise.resolve(false),
    ])
      .then(([onboardingCompleted, subscriptionEntitled]) => {
        if (active) setAccessState({ onboardingCompleted, subscriptionEntitled });
      })
      .catch(() => {
        if (active) setAccessState({ onboardingCompleted: false, subscriptionEntitled: false });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const redirectTarget =
    accessState && !accessState.onboardingCompleted
      ? '/(onboarding)/onboarding'
      : accessState && !accessState.subscriptionEntitled
        ? '/(onboarding)/pricing'
        : null;

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget]);

  if (accessState === null) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (redirectTarget) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={screenOptions}
    >
      <Tabs.Screen
        name="dashboard"
        options={HOME_OPTIONS}
      />
      <Tabs.Screen
        name="inbox"
        options={inboxOptions}
      />
      <Tabs.Screen
        name="calendar"
        options={CALENDAR_OPTIONS}
      />
      <Tabs.Screen
        name="settings"
        options={SETTINGS_OPTIONS}
      />

      {/* Secondary screens reachable from Dashboard, Inbox, and More. */}
      <Tabs.Screen name="ai-settings" options={HIDDEN_ROUTE_OPTIONS} />
      <Tabs.Screen name="billing" options={HIDDEN_ROUTE_OPTIONS} />
      <Tabs.Screen name="channels" options={HIDDEN_ROUTE_OPTIONS} />
      <Tabs.Screen name="payments" options={HIDDEN_ROUTE_OPTIONS} />
      <Tabs.Screen name="profile" options={HIDDEN_ROUTE_OPTIONS} />
      <Tabs.Screen name="thread" options={HIDDEN_ROUTE_OPTIONS} />
      <Tabs.Screen name="upload" options={HIDDEN_ROUTE_OPTIONS} />
    </Tabs>
  );
}

function ProviderTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const currentName = state.routes[state.index]?.name;
  const activeName = SECONDARY_PARENT[currentName] ?? currentName;
  const visibleRoutes = state.routes.filter((route) => VISIBLE_TABS.includes(route.name as any));

  return (
    <View pointerEvents="box-none" style={styles.tabWrap}>
      <View style={styles.tabBar}>
        {Platform.OS === 'ios' ? <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} /> : null}
        <View style={styles.tabInner}>
          {visibleRoutes.map((route) => {
            const options = descriptors[route.key]?.options;
            const focused = activeName === route.name;
            const Icon = TAB_ICONS[route.name as keyof typeof TAB_ICONS];
            const label =
              typeof options?.title === 'string'
                ? options.title
                : typeof options?.tabBarLabel === 'string'
                  ? options.tabBarLabel
                  : route.name;
            const badge = options?.tabBarBadge;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!event.defaultPrevented) {
                Haptics.selectionAsync().catch(() => {});
                navigation.navigate(route.name as never);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={focused ? { selected: true } : undefined}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.tabButton,
                  focused && styles.tabButtonActive,
                  pressed && styles.tabButtonPressed,
                ]}
              >
                <Icon
                  size={focused ? 25 : 23}
                  color={focused ? colors.primary : colors.textSecondary}
                  strokeWidth={focused ? 2.7 : 2.25}
                />
                {badge ? (
                  <View style={styles.badge}>
                    <View style={styles.badgeDot} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  tabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: 14,
  },
  tabBar: {
    width: '72%',
    maxWidth: 360,
    minWidth: 288,
    height: 64,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.76)' : colors.surface,
    overflow: 'hidden',
    shadowColor: '#161334',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  tabInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  tabButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#f0edff',
    borderWidth: 1,
    borderColor: '#ded6ff',
  },
  tabButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.warning,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.onPrimary,
  },
});
