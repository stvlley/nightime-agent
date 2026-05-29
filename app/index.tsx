import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IndexScreen() {
  useEffect(() => {
    checkOnboardingAndRedirect();
  }, []);

  const checkOnboardingAndRedirect = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem('@onboarding_completed');
      
      if (onboardingCompleted === 'true') {
        // Check if user is logged in
        const userLoggedIn = await AsyncStorage.getItem('@user_logged_in');
        
        if (userLoggedIn === 'true') {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      } else {
        router.replace('/(onboarding)/splash');
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      router.replace('/(onboarding)/splash');
    }
  };

  return null;
}