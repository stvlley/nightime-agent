# App Store Submission Runbook

## Day -3

- Copy reviewer credentials from `.env.reviewer.local` into App Store Connect.
- Finish Cloudflare DNS for Vercel:
  - `A nitime.app 76.76.21.21`
  - `A www.nitime.app 76.76.21.21`
- Confirm hosted pages resolve on the final domain:
  - `https://nitime.app/privacy`
  - `https://nitime.app/terms`
  - `https://nitime.app/support`
- Confirm App Store Connect app record uses bundle ID `com.nightime.agent`.
- Confirm age rating answers reflect provider profiles, AI-assisted messaging, and age-gated public pages.
- Confirm export compliance matches `ITSAppUsesNonExemptEncryption=false`.
- Confirm StoreKit products are Ready to Submit.
- Confirm production Supabase migrations are applied. Current status: applied through `20260615020000`.
- Confirm production Edge Functions are deployed. Current status: `connect-channel`, `webchat-inbound`, `webchat-poll`, `send-draft`, `telegram-webhook`, `whatsapp-webhook`, and `google-voice-webhook` are active.
- For the lowest-cost beta, set `AGENT_LLM_DISABLED=true` and leave paid model
  API keys unset until approval flow and FAQ hit rate are validated.
  Current status: `AGENT_LLM_DISABLED=true`, `AGENT_LLM_MAX_TOKENS=180`.

## Day -2

- Run:

```sh
npm install
npm run typecheck
SUPABASE_SERVICE_ROLE_KEY="" DATABASE_URL="" npm run lint
npm test
npm run build:web
npm run release:audit
```

- Run selected Playwright production-smoke scripts if production env credentials are available.
- Verify app icon, launch behavior, onboarding, subscription paywall, restore purchase, inbox, web chat, public profile, payment links, and document import.
- Capture App Store screenshots.

## Day -1

- Build iOS production binary:

```sh
eas build --profile production --platform ios
```

- If EAS asks for Apple credentials, complete the interactive Apple login/2FA
  or configure an App Store Connect API key first. The current local attempt
  stopped at Apple credential validation.
- Install/TestFlight the build on a physical device.
- Run StoreKit sandbox purchase and restore.
- Confirm no bypass env vars are enabled.
- Confirm `AGENT_LLM_MAX_TOKENS` is set to `180` or lower unless a specific
  quality test proves a higher cap is needed.
- Confirm reviewer credentials and notes work.
- Upload screenshots, privacy answers, IAP review screenshots, and metadata.

## Submission Day

- Submit binary:

```sh
eas submit --profile production --platform ios
```

- In App Store Connect, attach the binary to the app version.
- Attach `nitime_annual` and `nitime_monthly` IAPs to the submission.
- Submit for review.
- Monitor App Review messages daily.

## Post-Approval

- Release manually unless phased release is explicitly chosen.
- Smoke test production immediately after release:
  - Fresh install.
  - Signup/login.
  - Onboarding.
  - Subscription purchase or existing entitlement.
  - Restore purchase.
  - Dashboard.
  - Web chat.
  - Inbox approval.
  - Direct payment-link display.
  - Document import failure/success copy.
- Watch Supabase function logs and app support inbox.

## Day +1 To Day +14

- Triage support daily.
- Track signup to trial start.
- Track trial start to channel connection.
- Track pending draft approval rate.
- Track failed StoreKit verification and restore errors.
- Track Edge Function error rates.
- Review App Store ratings and review text.
- Do not start Apple Search Ads until LTV:CAC is clear.
- Prefer organic TikTok/UGC launch content first.
- Default paid target: blended CAC less than or equal to one third of weekly subscription price.

## Rollback Triggers

- StoreKit purchases succeed but entitlement is not granted.
- Login/signup failure above normal baseline.
- Edge Function errors block inbound messages.
- Public profiles expose unpublished data.
- Payment-link UI implies Nitime processes client payments.
- App Review flags medical, adult-service marketplace, privacy, or subscription disclosure issues.
- Crash rate or support volume suggests a release-blocking defect.

## Rollback Actions

- Pull the release from sale if user harm or billing harm is likely.
- Disable affected channels or model calls with server-side flags where possible.
- Ship a hotfix build through expedited review only for severe production issues.
- Preserve logs and support reports for review.
