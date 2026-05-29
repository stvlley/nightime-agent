import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
  useFrameworkReady();
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('@onboarding_completed');
      setIsOnboardingCompleted(completed === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboardingCompleted(false);
    }
  };

  // Show loading while checking onboarding status
  if (isOnboardingCompleted === null) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!isOnboardingCompleted ? (
        <Stack.Screen name="(onboarding)" />
      ) : (
        <>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </>
      )}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}