# User-Only Launch Checklist

This is the short list of work that requires account ownership, credentials,
2FA, payment/admin access, DNS access, App Store Connect decisions, or a
physical iPhone. Repo-side checks and non-secret verification can be handled
without those credentials.

## DNS

- In Cloudflare, point `nitime.app` to `A 76.76.21.21`.
- In Cloudflare, point `www.nitime.app` to `A 76.76.21.21`.
- Confirm these open in a browser:
  - `https://nitime.app/`
  - `https://nitime.app/privacy`
  - `https://nitime.app/terms`
  - `https://nitime.app/support`

## App Store Connect App Record

- Platform: iOS
- Name: `Nitime`
- Bundle ID: `com.nightime.agent`
- SKU: `nitime-agent-ios`
- Primary language: English

The App Store Connect API key can read current state, but a prior `POST /apps`
attempt returned `403`, so this app record likely needs to be created manually
by an account owner.

## StoreKit Subscriptions

- Subscription group: `Nitime`
- Product ID: `nitime_annual`
  - Name: `Nitime Annual`
  - Price: `$299/year`
  - Intro offer: 7-day free trial
- Product ID: `nitime_monthly`
  - Name: `Nitime Monthly`
  - Price: `$39/month`
  - Intro offer: none

Add localization, pricing, subscription review screenshots, and review metadata,
then mark both products Ready to Submit before App Review.

## EAS Credentials And Build

Run the production iOS build interactively from this repo:

```sh
EAS_BUILD_NO_EXPO_GO_WARNING=true npx eas-cli build --profile production --platform ios
```

If EAS asks for Apple login, team selection, 2FA, certificate creation, or
provisioning profile approval, the account owner must complete it. Apple
credentials and 2FA codes should not be shared in git or chat.

## Build-Number Drift

Keep EAS remote versioning enabled. This repo already has:

- `eas.json` `cli.appVersionSource="remote"`
- production `autoIncrement=true`

Repeated failed or aborted EAS attempts can increment the remote iOS build
number. Last observed drift was around build number `9`. Treat this as cosmetic
unless App Store Connect rejects a duplicate build number.

Only if App Store Connect rejects a duplicate build number, run:

```sh
npx eas-cli build:version:set
```

Choose iOS, keep the remote version source, and set the remote build number to
the highest iOS build number already accepted in App Store Connect for version
`1.0.0`. Then rebuild once.

## Reviewer And Sandbox Accounts

- Make sure `reviewer@nitime.app` exists and can log into production.
- Put the reviewer password in App Store Connect review notes, not in git.
- Verify from a clean browser or device that the reviewer account reaches the
  expected paywall or provider workspace state.
- Create an App Store Connect sandbox tester with a real inbox you control.
- Do not reuse a personal Apple ID as the sandbox tester.

## Physical iPhone StoreKit Smoke

- Install the EAS/TestFlight build on a physical iPhone.
- Confirm annual and monthly products load.
- Start the annual trial.
- Confirm entitlement opens the provider workspace.
- Kill and reopen the app, then confirm entitlement persists.
- Reinstall and test Restore Purchase.
- Test cancellation and expiration behavior in Apple sandbox.

## Submission Metadata

Use `store/app-store-listing.md`, `store/privacy-policy.md`,
`store/terms-of-service.md`, and `store/submission-runbook.md` as source copy.
Add privacy answers, age rating, export compliance, support/privacy/terms URLs,
screenshots, subscription screenshots, and review notes in App Store Connect.

Review notes should explain:

- AI-assisted replies are drafts or provider-controlled FAQ replies.
- Providers can require approval before outbound messages are sent.
- Nitime does not process provider/client service payments.

## Submit

Once the iOS build succeeds and physical-device StoreKit smoke passes:

```sh
npx eas-cli submit --profile production --platform ios --latest
```

Attach the uploaded binary and both IAPs in App Store Connect before submitting
for review.
