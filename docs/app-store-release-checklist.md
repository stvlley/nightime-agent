# App Store Release Checklist

Use this alongside `npm run release:audit`. The script catches mechanical blockers; this file tracks review material that requires a human decision or App Store Connect data.

For account-owner-only tasks, use `store/user-only-launch-checklist.md`.

## Before EAS Production Build

- Confirm `.env` or the selected `RELEASE_ENV_FILE` has `EXPO_PUBLIC_BYPASS_PAYWALL=false` or unset.
- Confirm `EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT=false`.
- Confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` point to the production Supabase project.
- Confirm Supabase migrations are applied to production. Current status: applied through `20260615020000`.
- Deploy required Edge Functions: `connect-channel`, `webchat-inbound`, `webchat-poll`, `send-draft`, `telegram-webhook`, `whatsapp-webhook`, and `google-voice-webhook`. Current status: deployed.
- Confirm cost-first Supabase secrets are set: `AGENT_LLM_DISABLED=true`, `AGENT_LLM_MAX_TOKENS=180`.
- Confirm StoreKit product ids match App Store Connect exactly.
- Run `npm test`, `npm run typecheck`, `npm run lint`, and the selected Playwright suites.

## App Store Connect

- `store/app-store-listing.md` is reviewed. Reviewer email is `reviewer@nitime.app`; password lives in ignored `.env.reviewer.local`.
- `store/privacy-policy.md` is hosted and domain/email values are replaced.
- `store/terms-of-service.md` is hosted and domain/email values are replaced.
- `store/revenuecat-config-checklist.md` StoreKit section is complete.
- `store/submission-runbook.md` Day -3 through Day +14 tasks are assigned.
- Privacy policy route is deployed. `https://nitime.app/privacy` goes live after Cloudflare DNS points to Vercel.
- Support route is deployed. `https://nitime.app/support` goes live after Cloudflare DNS points to Vercel.
- Terms route is deployed. `https://nitime.app/terms` goes live after Cloudflare DNS points to Vercel.
- Account deletion instructions are live and reachable from support/privacy copy.
- Subscription terms are filled in and match the in-app paywall.
- Age rating answers match public-profile age-gate behavior and app content.
- Export compliance answers match `ITSAppUsesNonExemptEncryption`.
- Review notes include demo credentials or a clear demo path.
- Review notes explain AI-assisted replies and provider approval behavior.
- Review notes explain that provider payment links open external services and that Nitime does not process service payments.

## TestFlight Smoke

- Fresh install login/signup works.
- Onboarding and native purchase/trial path works.
- Restore purchase works where applicable.
- Provider dashboard opens after entitlement.
- Public profile opens from a real device.
- Web chat link opens and routes to the provider.
- Inbox approval flow works against production Supabase.
- Training file import works or fails with clear copy if training webhook is unavailable.
- Push notification permission copy is acceptable.

## Build Commands

```bash
npm run release:audit
EAS_BUILD_NO_EXPO_GO_WARNING=true npx eas-cli build --profile production --platform ios
npx eas-cli submit --profile production --platform ios --latest
```

## Build Number Guidance

- Keep EAS remote versioning enabled: `cli.appVersionSource="remote"` and production `autoIncrement=true`.
- Current remote iOS build-number drift, last observed around `9`, is cosmetic unless App Store Connect rejects a duplicate.
- Avoid repeated build attempts until Apple credentials and App Store Connect setup are ready.
- If App Store Connect rejects a duplicate build number, run `npx eas-cli build:version:set`, choose iOS, keep remote version source, set the build number to the highest iOS build number already accepted for version `1.0.0`, then rebuild once.

## Current External Blockers

- Cloudflare DNS for `nitime.app` still needs:
  - `A nitime.app 76.76.21.21`
  - `A www.nitime.app 76.76.21.21`
- EAS iOS build is blocked until Apple credential validation is completed interactively or an App Store Connect API key is configured.
- App Store Connect app record and IAPs still need to be created:
  - App name: Nitime
  - Bundle ID: `com.nightime.agent`
  - IAPs: `nitime_annual`, `nitime_monthly`
