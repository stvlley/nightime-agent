import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/hooks/useAuth';
import tamaguiConfig from '@/tamagui.config';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </AuthProvider>
    </TamaguiProvider>
  );
}
