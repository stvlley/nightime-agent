import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  ErrorCode,
  finishTransaction as finishTransactionInternal,
  getActiveSubscriptions as getActiveSubscriptionsInternal,
  type ProductSubscription,
  type Purchase,
  useIAP,
  verifyPurchase as verifyPurchaseInternal,
} from 'expo-iap';
import type { PlanId } from '@/components/onboarding/funnelData';
import { useAuth } from '@/hooks/useAuth';
import {
  getPlanForProduct,
  getPlanProductId,
  grantDemoEntitlement,
  grantSubscriptionEntitlement,
  isDevPaywallBypassEnabled,
  isDemoEntitlementEnabled,
  STOREKIT_SUBSCRIPTION_IDS,
} from '@/lib/subscriptions';

type PurchaseStatus = 'idle' | 'loading' | 'purchasing' | 'restoring' | 'verifying' | 'entitled' | 'unavailable' | 'error';

type UseStoreKitSubscriptionOptions = {
  onEntitlementGranted: () => void | Promise<void>;
};

function normalizeError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Store purchase failed.');
  }
  return 'Store purchase failed. Please try again.';
}

function productExpiration(purchase: Purchase): string | null {
  const maybeExpiration = (purchase as Purchase & { expirationDateIOS?: number | null }).expirationDateIOS;
  return maybeExpiration ? new Date(maybeExpiration).toISOString() : null;
}

function originalTransactionId(purchase: Purchase): string | null {
  return (
    (purchase as Purchase & { originalTransactionIdentifierIOS?: string | null }).originalTransactionIdentifierIOS ??
    null
  );
}

export function useStoreKitSubscription({ onEntitlementGranted }: UseStoreKitSubscriptionOptions) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PurchaseStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const grantVerifiedPurchase = useCallback(
    async (purchase: Purchase, source: 'purchase' | 'restore') => {
      if (!user) {
        throw new Error('Sign in before starting a trial.');
      }

      if (!STOREKIT_SUBSCRIPTION_IDS.includes(purchase.productId)) {
        throw new Error('The store returned an unknown subscription product.');
      }

      setStatus('verifying');
      if (Platform.OS !== 'ios') {
        throw new Error('Store subscription verification is currently configured for iOS StoreKit.');
      }

      const verification = await verifyPurchaseInternal({
        apple: { sku: purchase.productId },
      });

      if (!('isValid' in verification) || !verification.isValid) {
        throw new Error('The subscription could not be verified.');
      }

      await grantSubscriptionEntitlement({
        userId: user.id,
        productId: purchase.productId,
        plan: getPlanForProduct(purchase.productId),
        platform: 'ios',
        transactionId: purchase.transactionId,
        originalTransactionId: originalTransactionId(purchase),
        expiresAt: productExpiration(purchase),
        source,
      });

      await finishTransactionInternal({ purchase, isConsumable: false });
      setStatus('entitled');
      await onEntitlementGranted();
    },
    [onEntitlementGranted, user]
  );

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void grantVerifiedPurchase(purchase, 'purchase').catch((purchaseError) => {
        setError(normalizeError(purchaseError));
        setStatus('error');
      });
    },
    onPurchaseError: (purchaseError) => {
      if (purchaseError.code === ErrorCode.UserCancelled) {
        setStatus('idle');
        return;
      }
      setError(normalizeError(purchaseError));
      setStatus('error');
    },
    onError: (iapError) => {
      setError(normalizeError(iapError));
      setStatus('error');
    },
  });

  useEffect(() => {
    if (!connected) {
      setStatus((current) => (current === 'entitled' ? current : 'loading'));
      return;
    }

    setStatus((current) => (current === 'entitled' ? current : 'idle'));
    void fetchProducts({ skus: STOREKIT_SUBSCRIPTION_IDS, type: 'subs' });
  }, [connected, fetchProducts]);

  const productsByPlan = useMemo(() => {
    return subscriptions.reduce<Record<PlanId, ProductSubscription | undefined>>(
      (acc, subscription) => {
        const plan = getPlanForProduct(subscription.id);
        acc[plan] = subscription;
        return acc;
      },
      { annual: undefined, monthly: undefined }
    );
  }, [subscriptions]);

  const purchase = useCallback(
    async (plan: PlanId) => {
      setError(null);

      if (!user) {
        setError('Sign in before starting a trial.');
        setStatus('error');
        return;
      }

      if (isDevPaywallBypassEnabled) {
        setStatus('entitled');
        await onEntitlementGranted();
        return;
      }

      if (isDemoEntitlementEnabled) {
        setStatus('verifying');
        await grantDemoEntitlement(user.id, plan);
        setStatus('entitled');
        await onEntitlementGranted();
        return;
      }

      if (!connected) {
        setError('The App Store is not ready yet. Try again in a moment.');
        setStatus('unavailable');
        return;
      }

      const productId = getPlanProductId(plan);
      setStatus('purchasing');
      await requestPurchase({
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
        type: 'subs',
      });
    },
    [connected, onEntitlementGranted, requestPurchase, user]
  );

  const restore = useCallback(async () => {
    setError(null);

    if (!user) {
      setError('Sign in before restoring a purchase.');
      setStatus('error');
      return;
    }

    if (isDevPaywallBypassEnabled) {
      setStatus('entitled');
      await onEntitlementGranted();
      return;
    }

    if (isDemoEntitlementEnabled) {
      setStatus('verifying');
      await grantDemoEntitlement(user.id, 'annual');
      setStatus('entitled');
      await onEntitlementGranted();
      return;
    }

    if (!connected) {
      setError('The App Store is not ready yet. Try again in a moment.');
      setStatus('unavailable');
      return;
    }

    setStatus('restoring');
    const activeSubscriptions = await getActiveSubscriptionsInternal(STOREKIT_SUBSCRIPTION_IDS);

    const restored = activeSubscriptions.find((subscription) =>
      STOREKIT_SUBSCRIPTION_IDS.includes(subscription.productId)
    );

    if (!restored) {
      setError('No active Nightime subscription was found for this Apple ID.');
      setStatus('idle');
      return;
    }

    await grantSubscriptionEntitlement({
      userId: user.id,
      productId: restored.productId,
      plan: getPlanForProduct(restored.productId),
      platform: 'ios',
      source: 'restore',
      transactionId: restored.transactionId,
      expiresAt: restored.expirationDateIOS ? new Date(restored.expirationDateIOS).toISOString() : null,
    });
    setStatus('entitled');
    await onEntitlementGranted();
  }, [connected, onEntitlementGranted, user]);

  return {
    status,
    error,
    connected,
    isWebTrial: false,
    productsByPlan,
    purchase,
    restore,
  };
}
