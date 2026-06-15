import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_KEY = '@onboarding_completed';
export const USER_LOGGED_IN_KEY = '@user_logged_in';

export const onboardingUtils = {
  // Check if user has completed onboarding
  isOnboardingCompleted: async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  },

  // Mark onboarding as completed
  completeOnboarding: async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.error('Error marking onboarding as completed:', error);
    }
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
