# StoreKit Setup

Use direct StoreKit for v1. RevenueCat can wait until server-side webhooks,
cross-platform subscriptions, or richer subscriber analytics become necessary.

## Current Repo State

- Bundle ID: `com.nightime.agent`
- StoreKit library: `expo-iap`
- Product IDs:
  - `nitime_annual`
  - `nitime_monthly`
- Entitlement table: `subscription_entitlements`
- Native purchase hook: `hooks/useStoreKitSubscription.native.ts`
- Entitlement gate: `app/(tabs)/_layout.tsx`
- Release audit: `npm run release:audit`

## App Store Connect

Use the CLI helper when you have an App Store Connect API key:

```sh
export ASC_KEY_ID=<key-id>
export ASC_ISSUER_ID=<issuer-id>
export ASC_PRIVATE_KEY_PATH=/absolute/path/AuthKey_<key-id>.p8

npm run storekit:asc -- check
npm run storekit:asc -- setup
npm run storekit:asc -- eas-env production
```

`setup` creates the app record, subscription group, and subscription product
shells when they are missing. Apple still requires human review of pricing,
localizations, review screenshots, tax/banking agreements, and the Ready to
Submit state before TestFlight subscription testing is reliable.

1. Create or open the iOS app record for `com.nightime.agent`.
2. In Monetization / Subscriptions, create one subscription group:
   - Reference name: `Nitime`
3. Add auto-renewable subscriptions:
   - Product ID: `nitime_annual`
   - Reference/display name: `Nitime Annual`
   - Price: `$299/year`
   - Introductory offer: `7-day free trial`
   - Product ID: `nitime_monthly`
   - Reference/display name: `Nitime Monthly`
   - Price: `$39/month`
   - Introductory offer: none
4. Add localization, review notes, and subscription review screenshots.
5. Mark both subscriptions Ready to Submit.

Use one subscription group so a user can hold only one Nitime subscription at a
time.

## Release Env

Set this in the release env used by EAS:

```text
EXPO_PUBLIC_BYPASS_PAYWALL=false
EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT=false
EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID=nitime_annual
EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID=nitime_monthly
EXPO_PUBLIC_SUPABASE_URL=<production-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<production-supabase-anon-key>
```

Do not prefix server secrets with `EXPO_PUBLIC_`.

## Build

Before building:

```sh
EXPO_PUBLIC_BYPASS_PAYWALL=false \
EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT=false \
EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID=nitime_annual \
EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID=nitime_monthly \
npm run release:audit
```

Then build for a physical device:

```sh
npx eas-cli build --profile preview --platform ios
```

Use production once sandbox purchase and restore pass:

```sh
EAS_BUILD_NO_EXPO_GO_WARNING=true npx eas-cli build --profile production --platform ios
```

Keep EAS remote versioning enabled. Failed or aborted credential-validation
attempts can increment the remote iOS build number; treat that drift as cosmetic
unless App Store Connect rejects a duplicate.

## Sandbox Test

1. Create a sandbox tester in App Store Connect.
2. Install the EAS iOS build on a physical device.
3. Sign in with the sandbox Apple ID when prompted by the purchase sheet.
4. Confirm annual product loads with localized price.
5. Start annual trial.
6. Confirm `subscription_entitlements` has an active row.
7. Confirm the provider workspace opens.
8. Reinstall the app and tap Restore purchase.
9. Confirm monthly product can be purchased.
10. Test cancellation/expiration behavior in App Store sandbox tools.

Apple can take time to propagate product metadata to sandbox. If products do not
load immediately after editing App Store Connect, wait and retry before changing
code.

## RevenueCat Later

Add RevenueCat only when direct StoreKit is no longer enough:

- Need App Store Server Notifications handled for lifecycle events.
- Need one dashboard across iOS, Android, and web subscriptions.
- Need subscriber analytics or entitlement experiments.
- Need less custom receipt/subscription backend code.

For v1, direct StoreKit keeps fewer moving parts.
