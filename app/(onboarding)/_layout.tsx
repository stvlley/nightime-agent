import { Stack } from 'expo-router';
import { AuthGate } from '@/components/AuthGate';

export default function OnboardingLayout() {
  // First-run setup requires a session: every real entry point (landing/register
  // signup, Settings "Setup chat") lands here already authenticated. Gating the
  // whole group keeps the carousel and pricing screens from rendering to a
  // logged-out deep-link instead of relying on setup.tsx's inline redirect alone.
  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="pricing" />
        <Stack.Screen name="setup" />
      </Stack>
    </AuthGate>
  );
}
