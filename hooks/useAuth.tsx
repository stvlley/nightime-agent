import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import {
  isSupabaseConfigured,
  missingSupabaseConfigMessage,
  profileService,
  supabase,
} from '@/lib/supabase';
import { Database, Profile } from '@/types/database';
import { USER_LOGGED_IN_KEY } from '@/utils/onboarding';
import type { User as SupabaseUser } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
  demo?: boolean;
}

interface SignUpResult {
  success: boolean;
  demo?: boolean;
  warning?: string;
  error?: string;
}

interface SignInResult {
  success: boolean;
  userId?: string;
  demo?: boolean;
  warning?: string;
  error?: string;
}

interface GoogleSignInResult {
  success: boolean;
  userId?: string;
  email?: string;
  displayName?: string;
  profileCreated?: boolean;
  error?: string;
}

type ProfilePatch = Omit<Partial<Database['public']['Tables']['profiles']['Insert']>, 'id'>;

interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  signUp: (email: string, password: string, businessName: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  signOut: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<UpdateProfileResult>;
}

const DEMO_USER_KEY = '@demo_user';
const AUTH_TIMEOUT_MS = 15000;
const GOOGLE_OAUTH_NATIVE_REDIRECT_URL = 'nightime-agent://auth/callback';

function shouldAllowDemoAuthFallback(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /networkerror|failed to fetch|fetch failed|load failed|network request failed/i.test(message);
}

function isEmailRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /email.*rate limit|rate limit.*email|email rate limit exceeded/i.test(message);
}

function createDemoUser(email: string, businessName: string, id = `demo-${Date.now()}`): AuthUser {
  return {
    id,
    email,
    demo: true,
    profile: {
      id,
      email,
      business_name: businessName,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      plan: 'starter',
      usage_month_count: 0,
      usage_limit: 100,
      fcm_token: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Portal fields (Phase 1.5) — demo mode has no public profile.
      slug: null,
      display_name: businessName,
      headline: null,
      bio: null,
      avatar_url: null,
      location_label: null,
      published: false,
      age_gate_required: true,
    },
  };
}

function getGoogleOAuthRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return GOOGLE_OAUTH_NATIVE_REDIRECT_URL;
}

function getStringMetadata(user: SupabaseUser, keys: string[]): string | null {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function displayNameFromOAuthUser(user: SupabaseUser): string {
  const metadataName = getStringMetadata(user, ['full_name', 'name', 'display_name']);
  if (metadataName) return metadataName;

  const emailLocalPart = user.email?.split('@')[0]?.trim();
  return emailLocalPart || 'Nitime Provider';
}

function getOAuthParam(url: string, key: string): string | null {
  const parsed = new URL(url);
  const queryValue = parsed.searchParams.get(key);
  if (queryValue) return queryValue;

  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  return hashParams.get(key);
}

function getOAuthCodeFromUrl(url: string): string {
  const error = getOAuthParam(url, 'error_description') ?? getOAuthParam(url, 'error');
  if (error) {
    throw new Error(error);
  }

  const code = getOAuthParam(url, 'code');
  if (!code) {
    throw new Error('Google sign-in did not return an authorization code.');
  }

  return code;
}

async function withAuthTimeout<T>(operation: Promise<T>, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), AUTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single source of truth for auth state. Mounted once at the app root
 * (app/_layout.tsx) so every screen shares one session listener and one copy of
 * `user` — instead of each useAuth() call spinning up its own state and its own
 * Supabase subscription.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  const ensureOAuthProfile = async (
    authUser: SupabaseUser
  ): Promise<{ profile: Profile; profileCreated: boolean; displayName: string }> => {
    const existingProfile = await profileService.getProfile(authUser.id);
    const displayName = existingProfile?.display_name ?? displayNameFromOAuthUser(authUser);

    if (existingProfile) {
      return { profile: existingProfile, profileCreated: false, displayName };
    }

    const profile = await withAuthTimeout(
      profileService.upsertProfile({
        id: authUser.id,
        email: authUser.email,
        business_name: displayName,
        display_name: displayName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
      'Profile setup'
    );

    return { profile, profileCreated: true, displayName };
  };

  useEffect(() => {
    if (!supabase) {
      void loadDemoUser();
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          void loadUserProfile(session.user);
        } else if (shouldAllowDemoAuthFallback()) {
          void loadDemoUser();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setLoading(true);
        setTimeout(() => {
          void loadUserProfile(session.user);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, businessName: string): Promise<SignUpResult> => {
    setLoading(true);
    try {
      if (!supabase) {
        const demoUser = createDemoUser(email, businessName);
        await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
        return {
          success: true,
          demo: true,
          warning: missingSupabaseConfigMessage,
        };
      }

      const { data, error } = await withAuthTimeout(
        supabase.auth.signUp({
          email,
          password,
        }),
        'Registration'
      );

      if (error) throw error;

      if (data.user) {
        try {
          const profile = await withAuthTimeout(
            profileService.upsertProfile({
              id: data.user.id,
              email: data.user.email,
              business_name: businessName,
              display_name: businessName,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }),
            'Profile setup'
          );

          setUser({
            id: data.user.id,
            email: data.user.email ?? email,
            profile,
          });
        } catch (profileError) {
          setUser({
            id: data.user.id,
            email: data.user.email ?? email,
          });
        }
      }

      return { success: true };
    } catch (error: any) {
      if (isNetworkError(error) || (shouldAllowDemoAuthFallback() && isEmailRateLimitError(error))) {
        const demoUser = createDemoUser(email, businessName);
        await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
        return {
          success: true,
          demo: true,
          warning: isEmailRateLimitError(error)
            ? 'Supabase email rate limit was reached, so this account was started locally for testing.'
            : 'Auth service is unreachable, so this account was started locally for now.',
        };
      }
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    setLoading(true);
    try {
      if (!supabase) {
        const demoUser: AuthUser = {
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
            // Portal fields (Phase 1.5) — demo mode has no public profile.
            slug: null,
            display_name: 'Demo Business',
            headline: null,
            bio: null,
            avatar_url: null,
            location_label: null,
            published: false,
            age_gate_required: true,
          },
        };
        await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
        return {
          success: true,
          userId: demoUser.id,
          demo: true,
          warning: missingSupabaseConfigMessage,
        };
      }

      const { data, error } = await withAuthTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        'Login'
      );

      if (error) throw error;
      return { success: true, userId: data.user?.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
    setLoading(true);
    try {
      if (!supabase) {
        return { success: false, error: missingSupabaseConfigMessage };
      }

      const redirectTo = getGoogleOAuthRedirectUrl();
      const { data, error } = await withAuthTimeout(
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        }),
        'Google sign-in setup'
      );

      if (error) throw error;
      if (!data.url) {
        throw new Error('Google sign-in could not start.');
      }

      const browserResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (browserResult.type !== 'success' || !('url' in browserResult)) {
        return { success: false, error: 'Google sign-in was canceled.' };
      }

      const code = getOAuthCodeFromUrl(browserResult.url);
      const { data: sessionData, error: sessionError } = await withAuthTimeout(
        supabase.auth.exchangeCodeForSession(code),
        'Google sign-in'
      );

      if (sessionError) throw sessionError;
      if (!sessionData.user) {
        throw new Error('Google sign-in did not return a user.');
      }

      const { profile, profileCreated, displayName } = await ensureOAuthProfile(sessionData.user);
      const email = sessionData.user.email ?? profile.email ?? '';

      await AsyncStorage.removeItem(DEMO_USER_KEY);
      await AsyncStorage.setItem(USER_LOGGED_IN_KEY, 'true');
      setUser({
        id: sessionData.user.id,
        email,
        profile,
      });

      return {
        success: true,
        userId: sessionData.user.id,
        email,
        displayName,
        profileCreated,
      };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Unable to sign in with Google.' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (supabase) {
      await withAuthTimeout(supabase.auth.signOut({ scope: 'local' }), 'Sign out');
    }
    await AsyncStorage.removeItem(DEMO_USER_KEY);
    await AsyncStorage.removeItem(USER_LOGGED_IN_KEY);
    setUser(null);
    setLoading(false);
  };

  const updateProfile = async (patch: ProfilePatch): Promise<UpdateProfileResult> => {
    if (!user) return { success: false, error: 'Not signed in.' };
    try {
      if (!supabase) {
        // Demo mode: merge into the locally stored demo profile.
        const nextUser: AuthUser = {
          ...user,
          profile: { ...(user.profile as Profile), ...patch } as Profile,
        };
        await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        return { success: true };
      }

      const profile = await withAuthTimeout(
        profileService.upsertProfile({ id: user.id, email: user.email, ...patch }),
        'Profile update'
      );
      setUser({ ...user, profile });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Could not save the profile.' };
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    isSupabaseConfigured,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>. Wrap the app root in app/_layout.tsx.');
  }
  return context;
}
