# TestFlight Plan

Date: 2026-06-19

## Readiness Verdict

`blocked`

Nitime is structurally close to an internal TestFlight build, but it is not TestFlight-ready today. The current blockers are concrete and small:

1. `.env` currently enables `EXPO_PUBLIC_BYPASS_PAYWALL`; App Store/TestFlight builds must use `false` or unset.
2. The selected release env is missing `EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID` and `EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID`.
3. Apple credential validation or an App Store Connect API key is still required for EAS iOS builds.
4. App Store Connect app record and auto-renewable subscriptions still need to be created/confirmed.
5. StoreKit sandbox purchase, cancellation/expiration, and restore have not been verified on a physical iOS device.
6. `nitime.app` DNS/hosted URLs must be confirmed live before external beta or review.

## Current Repo Evidence

- App name: `Nitime`
- Package: `nightime-agent`
- Expo slug: `nightime-agent`
- Version: `1.0.0`
- iOS bundle ID: `com.nightime.agent`
- URL scheme: `nightime-agent`
- Expo owner: `stvll3y`
- EAS project ID: `0dbf9154-990b-4df3-88f5-ea145b963a13`
- EAS versioning: remote
- EAS profiles: `development` internal dev client, `preview` internal device build, `production` device build with `autoIncrement`
- Native IAP: `expo-iap` plugin present
- Native iOS project: none checked in; managed Expo/EAS flow
- Store docs present: app listing, privacy policy, terms, subscription checklist, solo Apple checklist, submission runbook, release checklist
- Hosted app routes present: `/privacy`, `/terms`, `/support`
- Account deletion path: support route and privacy copy tell users to email `support@nitime.app`

## Checks Run

- `npm run typecheck`: passed
- `npm test`: passed, 8 files / 61 tests
- `SUPABASE_SERVICE_ROLE_KEY="" DATABASE_URL="" npm run lint`: passed
- `npm run build:web`: passed, exported `dist/`
- `npm run release:audit`: failed, 27 passed / 2 failed

Release audit failures:

- Paywall bypass disabled: failed because `EXPO_PUBLIC_BYPASS_PAYWALL` is true in the selected env.
- StoreKit product IDs configured: failed because annual/monthly product env vars are missing.

Not run:

- `eas build`
- `eas submit`
- StoreKit sandbox purchase/restore on device
- Playwright production smoke scripts

## Build Plan

Use the `preview` profile first for internal TestFlight-style device validation:

```sh
EXPO_PUBLIC_BYPASS_PAYWALL=false \
EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT=false \
EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID=nitime_annual \
EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID=nitime_monthly \
npx eas-cli build --profile preview --platform ios
```

Use the `production` profile once StoreKit and App Store Connect are ready:

```sh
EAS_BUILD_NO_EXPO_GO_WARNING=true npx eas-cli build --profile production --platform ios
npx eas-cli submit --profile production --platform ios --latest
```

Do not reset EAS remote iOS build numbers during normal TestFlight prep. The
repo uses remote versioning and production auto-increment; only run
`npx eas-cli build:version:set` if App Store Connect later rejects a duplicate
build number.

Required release env:

```text
EXPO_PUBLIC_BYPASS_PAYWALL=false
EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT=false
EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID=nitime_annual
EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID=nitime_monthly
EXPO_PUBLIC_SUPABASE_URL=<production-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<production-supabase-anon-key>
```

Server-side production state to confirm:

- Supabase migrations applied through `20260615020000`.
- Edge Functions deployed: `connect-channel`, `webchat-inbound`, `webchat-poll`, `send-draft`, `telegram-webhook`, `whatsapp-webhook`, `google-voice-webhook`.
- Cost controls set: `AGENT_LLM_DISABLED=true`, `AGENT_LLM_MAX_TOKENS=180`.

External App Store Connect work:

- Create/open iOS app record for `com.nightime.agent`.
- Create subscription group `Nitime`.
- Create `nitime_annual` and `nitime_monthly`.
- Upload subscription review screenshots.
- Mark products Ready to Submit.
- Add reviewer account credentials from `.env.reviewer.local`.
- Confirm privacy/support/terms URLs resolve on `https://nitime.app`.

## Tester Plan

### Internal Cohort

Start with 3-5 testers:

- Stephen/founder
- One tester with a fresh Apple sandbox account
- One tester focused on provider workflow
- One tester focused on subscription restore/reinstall
- Optional: one tester for public profile/webchat

Internal entry criteria:

- Release audit passes with production env.
- EAS iOS build installs on a physical device.
- Annual and monthly products load from StoreKit.
- Fresh signup reaches paywall.
- Purchase grants entitlement and opens the provider workspace.

### First External Cohort

Invite 10-20 providers only after internal purchase/restore and core workflow are boring.

External entry criteria:

- StoreKit purchase and restore pass twice on device.
- Public profile and webchat work against production Supabase.
- Inbox approval flow works against production Supabase.
- Support/privacy/terms URLs are live.
- Reviewer/demo account path works.

Expansion criteria:

- No billing/entitlement blockers.
- No login/signup blocker.
- No public profile data leak.
- No channel setup dead end without clear support copy.
- Fewer than 2 severe issues in 48 hours.

## Test Matrix

### First Run

- Fresh install opens landing/onboarding.
- Register with production Supabase.
- Login/logout and relaunch preserve the correct state.
- Existing unpaid account routes to pricing.
- Paid/entitled account routes to tabs.

### Subscription

- Annual product loads with localized price.
- Annual trial starts and grants entitlement.
- Monthly product loads with no trial.
- Restore purchase works after reinstall.
- Cancellation/expiration behavior is understood from sandbox.
- Unknown product IDs fail with clear copy.
- `EXPO_PUBLIC_BYPASS_PAYWALL` and demo entitlement are off.

### Core Provider Workflow

- Dashboard loads.
- Inbox loads pending approvals.
- Thread detail opens.
- Draft approval/send path works for supported channels.
- FAQ/training upload works or fails with clear copy.
- AI settings persist.
- Billing screen does not contradict the real StoreKit state.

### Public Surface

- Public profile route loads on device.
- Unpublished profile does not expose details.
- Age-gated profile hides details until confirmation.
- Webchat link routes to the correct provider.
- Direct payment links do not imply Nitime processes client payments.

### Account And Support

- Support page opens and email link works.
- Privacy and terms routes load.
- Account deletion instructions are reachable.
- Reviewer credentials work from a clean install.

### Platform Behavior

- Deep link scheme `nightime-agent` does not break app launch.
- Bad network shows recoverable errors.
- App relaunch after purchase keeps entitlement.
- Document import permission copy matches actual behavior.
- Native push notification claims are not made unless a push implementation is added.

## Feedback Loop

- Collect feedback through TestFlight screenshots/crashes plus `support@nitime.app`.
- Ask testers to include: device model, iOS version, build number, account email, route/screen, expected result, actual result, and whether they were using sandbox purchase.
- Triage daily during internal beta.
- Before expanding external testers, tag issues as `billing`, `auth`, `public-profile`, `inbox`, `channel`, `copy`, or `crash`.
- Billing/auth/public-profile leaks are stop-the-line.

## Go/No-Go Checklist

Go for internal TestFlight only when:

- `npm run release:audit` passes.
- EAS iOS build succeeds with Apple credentials/API key.
- App installs on a physical iOS device.
- StoreKit products load.
- Purchase grants entitlement.
- Restore grants entitlement.
- Fresh signup and login work.
- Hosted privacy/terms/support routes are live or internal testers are explicitly told they are pending.

Go for external TestFlight only when:

- Internal beta completes one clean purchase/restore cycle.
- Reviewer/demo account works.
- Production Supabase and Edge Functions are confirmed.
- Public profile/webchat/inbox approval flows pass.
- Support inbox is monitored.
- App Store Connect IAPs are Ready to Submit.

Do not submit for App Review until:

- App Store Connect app record and IAPs are complete.
- DNS and hosted URLs are live.
- Screenshots and subscription review screenshots are uploaded.
- Review notes include demo credentials, AI-assisted draft explanation, provider approval behavior, direct payment-link explanation, and StoreKit sandbox product status.
