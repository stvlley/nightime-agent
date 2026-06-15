/*
  # Subscription entitlements

  Stores the provider's current app subscription entitlement after native store
  purchase verification. One active row per user is enough for the v1 hard gate;
  historical transaction audit can be split out later if needed.
*/

CREATE TABLE IF NOT EXISTS public.subscription_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  plan_id text NOT NULL CHECK (plan_id IN ('annual', 'monthly')),
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'demo')),
  transaction_id text,
  original_transaction_id text,
  expires_at timestamptz,
  verified_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'purchase' CHECK (source IN ('purchase', 'restore', 'demo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_entitlements_select_self" ON public.subscription_entitlements;
DROP POLICY IF EXISTS "subscription_entitlements_insert_self" ON public.subscription_entitlements;
DROP POLICY IF EXISTS "subscription_entitlements_update_self" ON public.subscription_entitlements;

CREATE POLICY "subscription_entitlements_select_self"
  ON public.subscription_entitlements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "subscription_entitlements_insert_self"
  ON public.subscription_entitlements FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "subscription_entitlements_update_self"
  ON public.subscription_entitlements FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_subscription_entitlements_active
  ON public.subscription_entitlements (user_id, active, expires_at);
