import { Stack } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/hooks/useAuth';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthProvider>
  );
}
