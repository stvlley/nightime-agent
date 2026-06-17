# Will Meeting Prep - June 17, 2026

## Goal

Align on the paid services, launch scope, and cost controls needed to move from local validation toward TestFlight and App Store review.

## Money Items To Discuss

- **OpenAI / coding-agent usage**
  - Agree on budget, model tier, and when to use cheaper versus stronger models.
  - Main risk: repeated development/test loops and future real agent calls.

- **Production AI agent runtime**
  - Every inbound client message can become a paid model call once the real agent is wired in.
  - Decide rate limits, daily caps, fallback behavior, and cost logging per conversation.

- **Supabase**
  - Covers database, auth, storage, Edge Functions, and row volume.
  - Decide whether the current plan is enough for beta/TestFlight and when to upgrade.

- **Vercel / hosting**
  - Covers the web app, public profiles, API/Edge usage, and deployment previews.
  - Confirm whether Hobby/Pro is acceptable for the launch path.

- **Apple Developer Program**
  - Required for TestFlight and App Store submission.
  - Cost: $99/year.

- **StoreKit / subscriptions**
  - Need real product IDs, subscription tiers, pricing, trial policy, and App Review copy.
  - Apple takes commission on paid subscriptions.

- **Messaging channels**
  - Biggest future variable cost area.
  - Discuss SMS/Twilio, WhatsApp Business, email sending, Telegram, and which channel launches first.

- **Email / OAuth**
  - Google OAuth may be free, but production email sending, domain verification, and support inbox tooling can add cost.

- **Monitoring / error tracking**
  - Decide whether free-tier monitoring is enough for beta or whether to add Sentry/log drains/analytics before TestFlight.

## What To Show

1. **Landing page and signup flow**
   - Public `/`
   - Provider signup/login modal
   - Signed-in redirect path

2. **Onboarding and paywall**
   - Provider onboarding flow
   - Pricing screen
   - Current dev bypass versus real StoreKit path

3. **Dashboard**
   - Stable workspace route: `/(tabs)/dashboard`
   - Mention the route-loop fix and browser validation.

4. **Channels**
   - Channel readiness
   - Current copy-link/webchat behavior

5. **Inbox approval flow**
   - Core product value: AI drafts wait for provider approval unless auto-send is configured.

6. **Training upload**
   - Upload flow for WhatsApp/history data
   - Explain this as the path to improving agent quality.

7. **Public profile**
   - Published profile
   - Unpublished profile
   - Age-gated profile
   - No-age-gate profile

8. **Live validation scripts**
   - Billing
   - Payments
   - Upload
   - Public profile matrix
   - Channels
   - Route-loop regression

9. **Release audit**
   - App Store readiness audit
   - Current blockers:
     - local paywall bypass must be off for release
     - StoreKit product IDs need real values
     - remaining native/TestFlight setup

## Decisions To Get

- What is the beta budget per month?
- Which AI model/cost tier should production use?
- Which messaging channel launches first?
- Are subscriptions mandatory for TestFlight, or can beta use free access?
- Who owns Apple Developer / App Store Connect setup?
- What is the first paid plan price?
- What usage limits should protect us from surprise AI/SMS costs?

## Suggested Meeting Flow

Start with the route-loop fix and passing validation suite briefly, then spend most of the meeting on cost controls, launch scope, and TestFlight readiness.
