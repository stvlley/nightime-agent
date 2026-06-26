import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { PlanId } from '@/components/onboarding/funnelData';

export type SubscriptionPlatform = 'ios' | 'android' | 'web' | 'demo';

export type SubscriptionEntitlementInput = {
  userId: string;
  productId: string;
  plan: PlanId;
  platform: SubscriptionPlatform;
  transactionId?: string | null;
  originalTransactionId?: string | null;
  expiresAt?: string | null;
  source: 'purchase' | 'restore' | 'web_trial' | 'demo';
};

export const STOREKIT_PRODUCT_IDS: Record<PlanId, string> = {
  annual: process.env.EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID ?? 'nitime_annual',
  monthly: process.env.EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID ?? 'nitime_monthly',
};

export const STOREKIT_SUBSCRIPTION_IDS = Object.values(STOREKIT_PRODUCT_IDS);

export const isStoreKitPlatform = Platform.OS === 'ios' || Platform.OS === 'android';

export const isDemoEntitlementEnabled =
  process.env.EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT === 'true';

export const isDevPaywallBypassEnabled =
  process.env.EXPO_PUBLIC_BYPASS_PAYWALL === 'true';

const entitlementKey = (userId: string) => `@subscription_entitlement:${userId}`;

function productIdToPlan(productId: string): PlanId {
  return productId === STOREKIT_PRODUCT_IDS.monthly ? 'monthly' : 'annual';
}

export function getPlanProductId(plan: PlanId): string {
  return STOREKIT_PRODUCT_IDS[plan];
}

export function getPlanForProduct(productId: string): PlanId {
  return productIdToPlan(productId);
}

export async function grantSubscriptionEntitlement(input: SubscriptionEntitlementInput): Promise<void> {
  const verifiedAt = new Date().toISOString();

  if (supabase) {
    const { error: entitlementError } = await supabase.from('subscription_entitlements').upsert(
      {
        user_id: input.userId,
        product_id: input.productId,
        plan_id: input.plan,
        platform: input.platform,
        transaction_id: input.transactionId ?? null,
        original_transaction_id: input.originalTransactionId ?? null,
        expires_at: input.expiresAt ?? null,
        verified_at: verifiedAt,
        active: true,
        source: input.source,
      },
      { onConflict: 'user_id' }
    );

    if (entitlementError) {
      throw entitlementError;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan: input.plan === 'annual' ? 'premium' : 'pro' })
      .eq('id', input.userId);

    if (profileError) {
      throw profileError;
    }
  }

  await AsyncStorage.setItem(
    entitlementKey(input.userId),
    JSON.stringify({
      ...input,
      verifiedAt,
      active: true,
    })
  );
}

function isAutoEntitled(): boolean {
  return isDemoEntitlementEnabled || isDevPaywallBypassEnabled;
}

export async function hasSubscriptionEntitlement(userId: string): Promise<boolean> {
  if (isAutoEntitled()) {
    return true;
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('subscription_entitlements')
      .select('active, expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return false;
    }

    if (!data?.active) {
      return false;
    }

    return !data.expires_at || new Date(data.expires_at).getTime() > Date.now();
  }

  try {
    const stored = await AsyncStorage.getItem(entitlementKey(userId));
    if (!stored) return false;
    const parsed = JSON.parse(stored) as { active?: boolean; expiresAt?: string | null };
    return Boolean(parsed.active) && (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() > Date.now());
  } catch {
    return false;
  }
}

export async function hasRecordedSubscriptionEntitlement(userId: string): Promise<boolean> {
  if (isAutoEntitled()) {
    return true;
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('subscription_entitlements')
      .select('user_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      return false;
    }

    return Boolean(data);
  }

  try {
    return Boolean(await AsyncStorage.getItem(entitlementKey(userId)));
  } catch {
    return false;
  }
}

export async function grantDemoEntitlement(userId: string, plan: PlanId): Promise<void> {
  await grantSubscriptionEntitlement({
    userId,
    productId: getPlanProductId(plan),
    plan,
    platform: 'demo',
    source: 'demo',
    transactionId: `demo-${Date.now()}`,
  });
}

export async function grantWebTrialEntitlement(userId: string, plan: PlanId): Promise<void> {
  await grantSubscriptionEntitlement({
    userId,
    productId: `web_trial_${plan}`,
    plan,
    platform: 'web',
    source: 'web_trial',
    transactionId: `web-trial-${Date.now()}`,
  });
}
