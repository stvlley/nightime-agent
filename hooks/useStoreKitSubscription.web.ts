import { useCallback, useMemo, useState } from 'react';
import type { PlanId } from '@/components/onboarding/funnelData';
import { useAuth } from '@/hooks/useAuth';
import {
  grantDemoEntitlement,
  isDemoEntitlementEnabled,
} from '@/lib/subscriptions';

type UseStoreKitSubscriptionOptions = {
  onEntitlementGranted: () => void | Promise<void>;
};

type PurchaseStatus = 'idle' | 'loading' | 'purchasing' | 'restoring' | 'verifying' | 'entitled' | 'unavailable' | 'error';
type StoreProductPreview = { displayPrice: string };

export function useStoreKitSubscription({ onEntitlementGranted }: UseStoreKitSubscriptionOptions) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PurchaseStatus>('unavailable');

  const purchase = useCallback(
    async (plan: PlanId) => {
      setError(null);

      if (!isDemoEntitlementEnabled) {
        setStatus('unavailable');
        setError('StoreKit subscriptions require an iOS development or App Store build.');
        return;
      }

      if (!user) {
        setStatus('error');
        setError('Sign in before starting a trial.');
        return;
      }

      setStatus('verifying');
      await grantDemoEntitlement(user.id, plan);
      setStatus('entitled');
      await onEntitlementGranted();
    },
    [onEntitlementGranted, user]
  );

  const restore = useCallback(async () => {
    setStatus('unavailable');
    setError('Restore purchase is available in the iOS app build.');
  }, []);

  return {
    status,
    error,
    connected: false,
    productsByPlan: useMemo<Record<PlanId, StoreProductPreview | undefined>>(
      () => ({ annual: undefined, monthly: undefined }),
      []
    ),
    purchase,
    restore,
  };
}
