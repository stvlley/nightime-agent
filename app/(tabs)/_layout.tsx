import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { router, Tabs } from 'expo-router';
import { CalendarDays, Inbox, LayoutDashboard, Settings2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/components/ui';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/hooks/useAuth';
import { draftService } from '@/lib/data';
import { type OnboardingAccessState, onboardingUtils } from '@/utils/onboarding';

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
  dashboard: LayoutDashboard,
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
  const [accessState, setAccessState] = useState<OnboardingAccessState | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setAccessState({ onboardingCompleted: false, subscriptionEntitled: false });
      return () => {
        active = false;
      };
    }

    onboardingUtils
      .getAccessState(userId)
      .then((nextAccessState) => {
        if (active) setAccessState(nextAccessState);
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
  const insets = useSafeAreaInsets();
  const currentName = state.routes[state.index]?.name;
  const activeName = SECONDARY_PARENT[currentName] ?? currentName;
  const visibleRoutes = state.routes.filter((route) => VISIBLE_TABS.includes(route.name as any));

  return (
    <View pointerEvents="box-none" style={[styles.tabWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBar}>
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
            const badgeLabel =
              typeof badge === 'number' && badge > 9
                ? '9+'
                : typeof badge === 'number' || typeof badge === 'string'
                  ? String(badge)
                  : '';

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
                hitSlop={4}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.tabButton,
                  focused && styles.tabButtonActive,
                  pressed && styles.tabButtonPressed,
                ]}
              >
                <Icon
                  size={focused ? 21 : 20}
                  color={focused ? colors.primaryActive : colors.textSecondary}
                  strokeWidth={focused ? 2.5 : 2.2}
                />
                {badge ? (
                  <View style={styles.badge}>
                    {badgeLabel ? (
                      <Text style={styles.badgeText}>{badgeLabel}</Text>
                    ) : (
                      <View style={styles.badgeFallbackDot} />
                    )}
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
  },
  tabBar: {
    width: '60%',
    maxWidth: 288,
    minWidth: 232,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tabInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  tabButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.accentDim,
  },
  tabButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.danger,
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
    textAlign: 'center',
    includeFontPadding: false,
  },
  badgeFallbackDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.onPrimary,
  },
});
