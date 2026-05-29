import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isSupabaseConfigured,
  missingSupabaseConfigMessage,
  profileService,
  supabase,
} from '@/lib/supabase';
import { Profile } from '@/types/database';

interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
  demo?: boolean;
}

const DEMO_USER_KEY = '@demo_user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      loadDemoUser();
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadDemoUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(DEMO_USER_KEY);
      setUser(stored ? JSON.parse(stored) : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (authUser: { id: string; email?: string }) => {
    try {
      const profile = await profileService.getProfile(authUser.id);
      setUser({
        id: authUser.id,
        email: authUser.email ?? '',
        profile: profile ?? undefined,
      });
    } catch (error) {
      setUser({
        id: authUser.id,
        email: authUser.email ?? '',
      });
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, businessName: string) => {
    setLoading(true);
    try {
      if (!supabase) {
        const demoUser = {
          id: `demo-${Date.now()}`,
          email,
          demo: true,
          profile: {
            id: `demo-${Date.now()}`,
            email,
            business_name: businessName,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            plan: 'starter',
            usage_month_count: 0,
            usage_limit: 100,
            fcm_token: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
        await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
        return {
          success: true,
          demo: true,
          warning: missingSupabaseConfigMessage,
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await profileService.upsertProfile({
          id: data.user.id,
          email: data.user.email,
          business_name: businessName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      if (!supabase) {
        const demoUser = {
          id: 'demo-user',
          email,
          demo: true,
          profile: {
            id: 'demo-user',
            email,
            business_name: 'Demo Business',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            plan: 'starter',
            usage_month_count: 0,
            usage_limit: 100,
            fcm_token: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
        await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
        return {
          success: true,
          demo: true,
          warning: missingSupabaseConfigMessage,
        };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    await AsyncStorage.removeItem(DEMO_USER_KEY);
    setUser(null);
  };

  return {
    user,
    loading,
    isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
  };
}
