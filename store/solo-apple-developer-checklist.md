# Solo Apple Developer Checklist

Use this when moving as far as possible without Will. It assumes you have Apple Developer access and can create App Store Connect resources yourself.

## App Store Connect Setup

Current blocker: EAS stopped at Apple credential validation. Complete Apple
login/2FA in EAS or configure an App Store Connect API key before building.

1. Create or open the app record.
   - Platform: iOS
   - Name: Nitime
   - Bundle ID: `com.nightime.agent`
   - SKU: `nitime-agent-ios`
   - Primary language: English

2. Fill URLs.
   - Marketing: `https://nitime.app/`
   - Support: `https://nitime.app/support`
   - Privacy: `https://nitime.app/privacy`
   - Terms: `https://nitime.app/terms`
   - DNS must point Cloudflare to Vercel first:
     - `A nitime.app 76.76.21.21`
     - `A www.nitime.app 76.76.21.21`

3. Create one auto-renewable subscription group.
   - Group name: Nitime
   - Product: `nitime_annual`, $299/year, 7-day free trial
   - Product: `nitime_monthly`, $39/month, no trial

4. Add subscription review screenshots.
   - Use the paywall screen showing price, trial, renewal, cancellation, and restore text.

5. Create a sandbox tester.
   - Use a real inbox you control.
   - Do not reuse your Apple ID.

## EAS/Environment

Set production env values:

```text
EXPO_PUBLIC_BYPASS_PAYWALL=false
EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT=false
EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID=nitime_annual
EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID=nitime_monthly
EXPO_PUBLIC_SUPABASE_URL=<production-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<production-supabase-anon-key>
AGENT_LLM_DISABLED=true
AGENT_LLM_MAX_TOKENS=180
```

Leave `ANTHROPIC_API_KEY` unset until you intentionally enable paid model drafts. The app still queues deterministic holding replies and FAQ replies without paid LLM calls.

Current production Supabase status:

- Migrations applied through `20260615020000`.
- Functions active: `connect-channel`, `webchat-inbound`, `webchat-poll`, `send-draft`, `telegram-webhook`, `whatsapp-webhook`, `google-voice-webhook`.
- Cost controls set: `AGENT_LLM_DISABLED=true`, `AGENT_LLM_MAX_TOKENS=180`.
- App Review demo email: `reviewer@nitime.app`; password is in ignored `.env.reviewer.local`.

## Cost-First Defaults

- Launch TestFlight with `AGENT_LLM_DISABLED=true`.
- Keep web chat and Telegram as the first self-serve channels.
- Keep WhatsApp and Google Voice assisted until account setup and volume are clear.
- Do not add RevenueCat for v1; direct StoreKit is already wired.
- Do not add Apple Search Ads until trial-to-paid conversion is known.
- Do not enable paid model drafts until FAQ hit rate and approval flow are validated.

## Commands

```sh
npm run release:audit
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

## Manual Checks Before Submit

- StoreKit sandbox purchase grants entitlement.
- Restore purchase grants entitlement after reinstall.
- Paywall bypass is off.
- Demo entitlement is off.
- Public profile unpublished state does not leak profile text.
- Age-gated profile hides details until confirmation.
- Payment links clearly say money does not move through Nitime.
- Privacy/terms/support URLs are live.
