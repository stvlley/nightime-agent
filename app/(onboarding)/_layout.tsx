import { Stack } from 'expo-router';
import { AuthGate } from '@/components/AuthGate';

export default function OnboardingLayout() {
  // Conversion onboarding requires a session because it is entered after signup.
  // Gating the group keeps logged-out deep-links on the public landing page.
  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="pricing" />
      </Stack>
    </AuthGate>
  );
}
