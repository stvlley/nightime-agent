# App Store Release Checklist

Use this alongside `npm run release:audit`. The script catches mechanical blockers; this file tracks review material that requires a human decision or App Store Connect data.

## Before EAS Production Build

- Confirm `.env` or the selected `RELEASE_ENV_FILE` has `EXPO_PUBLIC_BYPASS_PAYWALL=false` or unset.
- Confirm `EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT=false`.
- Confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` point to the production Supabase project.
- Confirm Supabase migrations are applied to production.
- Deploy required Edge Functions: `webchat-inbound`, `webchat-poll`, `send-draft`, plus any enabled channel webhooks.
- Confirm StoreKit product ids match App Store Connect exactly.
- Run `npm test`, `npm run typecheck`, `npm run lint`, and the selected Playwright suites.

## App Store Connect

- `store/app-store-listing.md` is reviewed and placeholder reviewer credentials are replaced.
- `store/privacy-policy.md` is hosted and placeholder domain/email values are replaced.
- `store/terms-of-service.md` is hosted and placeholder domain/email values are replaced.
- `store/revenuecat-config-checklist.md` StoreKit section is complete.
- `store/submission-runbook.md` Day -3 through Day +14 tasks are assigned.
- Privacy policy URL is live.
- Support URL is live.
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
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production
```
