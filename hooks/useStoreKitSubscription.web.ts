import { useCallback, useMemo, useState } from 'react';
import type { PlanId } from '@/components/onboarding/funnelData';
import { useAuth } from '@/hooks/useAuth';
import { grantWebTrialEntitlement, isDevPaywallBypassEnabled } from '@/lib/subscriptions';

type UseStoreKitSubscriptionOptions = {
  onEntitlementGranted: () => void | Promise<void>;
};

type PurchaseStatus = 'idle' | 'loading' | 'purchasing' | 'restoring' | 'verifying' | 'entitled' | 'unavailable' | 'error';
type StoreProductPreview = { displayPrice: string };

export function useStoreKitSubscription({ onEntitlementGranted }: UseStoreKitSubscriptionOptions) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PurchaseStatus>('idle');

  const purchase = useCallback(
    async (plan: PlanId) => {
      setError(null);

      if (!user) {
        setStatus('error');
        setError('Sign in before starting a trial.');
        return;
      }

      try {
        setStatus('verifying');
        if (!isDevPaywallBypassEnabled) {
          await grantWebTrialEntitlement(user.id, plan);
        }
        setStatus('entitled');
        await onEntitlementGranted();
      } catch (purchaseError) {
        setStatus('error');
        setError(purchaseError instanceof Error ? purchaseError.message : 'Could not start the trial.');
      }
    },
    [onEntitlementGranted, user]
  );

  const restore = useCallback(async () => {
    setStatus('idle');
    setError('Web trial access is tied to your signed-in account. Log in with the same email to continue.');
  }, []);

  return {
    status,
    error,
    connected: false,
    isWebTrial: true,
    productsByPlan: useMemo<Record<PlanId, StoreProductPreview | undefined>>(
      () => ({ annual: undefined, monthly: undefined }),
      []
    ),
    purchase,
    restore,
  };
}
