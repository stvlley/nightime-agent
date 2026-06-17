import { ReactNode, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

/**
 * Gates a route group behind an authenticated session. While the shared
 * AuthProvider resolves the session it shows a centered spinner on the night
 * background; once resolved, unauthenticated users are bounced to the public
 * landing page (`/`). Used by the (tabs) and (onboarding) group layouts so the
 * provider workspace and first-run setup share one guard instead of each screen
 * re-implementing its own redirect.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}
