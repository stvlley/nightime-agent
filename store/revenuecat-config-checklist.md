# Subscription Configuration Checklist

Nitime currently uses StoreKit through `expo-iap`, not RevenueCat. Do not create or modify Apple Developer, RevenueCat, or billing accounts without explicit human sign-off.

## App Store Connect

- Bundle ID: `com.nightime.agent`
- Subscription group: Nitime
- Products:
  - `nitime_annual`
    - Display name: Nitime Annual
    - Price: $299/year
    - Trial: 7-day free trial
  - `nitime_monthly`
    - Display name: Nitime Monthly
    - Price: $39/month
    - Trial: none
- Both products are auto-renewable subscriptions.
- Products are Ready to Submit before the app version is submitted.
- Subscription review screenshot is uploaded for each product.
- App Store localization matches in-app paywall terms.

## App Environment

Set these for production builds:

```text
EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID=nitime_annual
EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID=nitime_monthly
EXPO_PUBLIC_BYPASS_PAYWALL=false
EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT=false
EXPO_PUBLIC_SUPABASE_URL=<production-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<production-supabase-anon-key>
```

Do not expose service role keys, database URLs, OAuth client secrets, or model API keys through `EXPO_PUBLIC_*`.

## Native Sandbox Verification

- Build a production or preview iOS binary with StoreKit enabled.
- Install on a physical iOS device.
- Sign into a StoreKit sandbox account.
- Confirm annual trial product loads with localized price.
- Start annual trial.
- Confirm entitlement row is written to `subscription_entitlements`.
- Confirm provider profile plan upgrades to `premium`.
- Restore purchase from a fresh install.
- Confirm cancellation/expiration behavior in sandbox.
- Confirm monthly product can be purchased with no trial if selected.

## RevenueCat Status

RevenueCat is not currently used.

If RevenueCat is later added:

- Create RevenueCat project after human sign-off.
- Map App Store products to RevenueCat products.
- Create entitlement: `nitime_provider_access`.
- Create offering: `default`.
- Attach annual and monthly packages.
- Replace direct StoreKit verification flow with RevenueCat entitlement checks.
- Re-run purchase, restore, expiration, and webhook verification.
