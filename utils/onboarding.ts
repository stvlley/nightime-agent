import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasRecordedSubscriptionEntitlement,
  hasSubscriptionEntitlement,
} from '@/lib/subscriptions';

export const ONBOARDING_KEY = '@onboarding_completed';
export const USER_LOGGED_IN_KEY = '@user_logged_in';

export type OnboardingAccessState = {
  onboardingCompleted: boolean;
  subscriptionEntitled: boolean;
};

function onboardingKey(userId?: string): string {
  return userId ? `${ONBOARDING_KEY}:${userId}` : ONBOARDING_KEY;
}

export const onboardingUtils = {
  // Check if user has completed onboarding
  isOnboardingCompleted: async (userId?: string): Promise<boolean> => {
    try {
      const [scopedValue, legacyValue] = await Promise.all([
        userId ? AsyncStorage.getItem(onboardingKey(userId)) : Promise.resolve(null),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);
      return scopedValue === 'true' || legacyValue === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  },

  // Mark onboarding as completed
  completeOnboarding: async (userId?: string): Promise<void> => {
    try {
      await Promise.all([
        AsyncStorage.setItem(ONBOARDING_KEY, 'true'),
        userId ? AsyncStorage.setItem(onboardingKey(userId), 'true') : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error marking onboarding as completed:', error);
    }
  },

  // Clear only the completion flag so a newly created account starts onboarding
  // even if this device previously finished it for another session.
  resetOnboardingCompletion: async (userId?: string): Promise<void> => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ONBOARDING_KEY),
        userId ? AsyncStorage.removeItem(onboardingKey(userId)) : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error resetting onboarding completion:', error);
    }
  },

  // Resolve the app's post-auth gate. A durable subscription/trial entitlement
  // proves the paywall step was completed, even if the local onboarding flag was
  // cleared by a reinstall, browser storage reset, or another device.
  getAccessState: async (userId: string): Promise<OnboardingAccessState> => {
    const [
      localOnboardingCompleted,
      subscriptionEntitled,
      subscriptionRecorded,
    ] = await Promise.all([
      onboardingUtils.isOnboardingCompleted(userId),
      hasSubscriptionEntitlement(userId),
      hasRecordedSubscriptionEntitlement(userId),
    ]);
    const onboardingCompleted =
      localOnboardingCompleted || subscriptionEntitled || subscriptionRecorded;

    if ((subscriptionEntitled || subscriptionRecorded) && !localOnboardingCompleted) {
      await onboardingUtils.completeOnboarding(userId);
    }

    return { onboardingCompleted, subscriptionEntitled };
  },

  // Reset onboarding (for testing/debugging)
  resetOnboarding: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      await AsyncStorage.removeItem(USER_LOGGED_IN_KEY);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  },

  // Check if user is logged in
  isUserLoggedIn: async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(USER_LOGGED_IN_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  },

  // Mark user as logged in
  setUserLoggedIn: async (loggedIn: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem(USER_LOGGED_IN_KEY, loggedIn.toString());
    } catch (error) {
      console.error('Error setting login status:', error);
    }
  },
};
