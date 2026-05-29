import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface User {
  id: string;
  email: string;
  businessName: string;
  plan: 'starter' | 'pro' | 'premium';
  createdAt: string;
}

export interface Platform {
  id: string;
  name: string;
  type: 'whatsapp' | 'sms' | 'email' | 'telegram';
  connected: boolean;
  lastSync?: string;
}

export interface Conversation {
  id: string;
  clientName: string;
  clientPhone?: string;
  platform: Platform['type'];
  messages: Message[];
  lastActivity: string;
  status: 'active' | 'archived';
  tags: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  sender: 'client' | 'therapist' | 'ai';
  timestamp: string;
  aiGenerated?: boolean;
  aiConfidence?: number;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone?: string;
  service: string;
  datetime: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  notes?: string;
  reminderSent?: boolean;
}

export interface AISettings {
  enabled: boolean;
  moderationLevel: 'low' | 'medium' | 'strict';
  autoResponse: boolean;
  confidenceThreshold: number;
  learningEnabled: boolean;
}

export interface FAQ {
  id: string;
  trigger: string;
  response: string;
  category: string;
  priority: number;
  active: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    aiResponses: number;
    platforms: number;
    storage: string;
  };
}

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