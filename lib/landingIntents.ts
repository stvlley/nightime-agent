import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type LandingIntentRole = 'provider' | 'client';

export type LandingIntentInput = {
  role: LandingIntentRole;
  email: string;
  name: string;
};

const LOCAL_QUEUE_KEY = '@landing_intents_local';

export async function recordLandingIntent(input: LandingIntentInput): Promise<void> {
  const payload = {
    role: input.role,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
  };

  if (supabase) {
    const userAgent =
      Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent : null;

    const { error } = await supabase
      .from('landing_intents')
      .insert({ ...payload, user_agent: userAgent });

    if (!error) {
      return;
    }
  }

  const existing = await AsyncStorage.getItem(LOCAL_QUEUE_KEY);
  const queue: Array<LandingIntentInput & { createdAt: string }> = existing
    ? JSON.parse(existing)
    : [];
  queue.push({ ...payload, createdAt: new Date().toISOString() });
  await AsyncStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queue));
}
