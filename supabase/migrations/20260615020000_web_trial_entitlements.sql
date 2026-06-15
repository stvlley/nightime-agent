/*
  # Web trial entitlements

  Allows the web app to grant a provider trial entitlement while native iOS keeps
  using StoreKit. This is intentionally distinct from StoreKit purchase/restore
  rows so the web checkout can be replaced with Stripe or another web payment
  path later without changing the iOS flow.
*/

ALTER TABLE public.subscription_entitlements
  DROP CONSTRAINT IF EXISTS subscription_entitlements_platform_check,
  DROP CONSTRAINT IF EXISTS subscription_entitlements_source_check;

ALTER TABLE public.subscription_entitlements
  ADD CONSTRAINT subscription_entitlements_platform_check
  CHECK (platform IN ('ios', 'android', 'web', 'demo')),
  ADD CONSTRAINT subscription_entitlements_source_check
  CHECK (source IN ('purchase', 'restore', 'web_trial', 'demo'));
