# Getting Started — Nightime Agent

## Prerequisites
- Node.js 22
- npm
- Expo CLI
- Optional for backend/expo-iap: a Supabase project used for entitlements

## Environment setup
1. Copy the example config:
   ```bash
   cp .env.example .env
   ```
2. Fill in only the values you have; demo mode still works with an empty `.env`.
3. Server-side secrets used by lint must be present in the process env at least as empty strings:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY=""
   export DATABASE_URL=""
   ```

## Install
```bash
npm install
```

## Validation
```bash
npm test
npm run typecheck
npm run lint
npm run release:audit
```

## Development
```bash
npm run dev
```

## Local agent + OpenRouter smoke test
This path uses the local Supabase stack, so it does not use hosted Supabase
resources. It may make OpenRouter API calls when `OPENROUTER_API_KEY` is set
and `AGENT_LLM_DISABLED` is not `true`.

In `.env`, keep the key server-side only:

```bash
OPENROUTER_API_KEY=sk-or-...
AGENT_MODEL=openrouter/free
AGENT_LLM_DISABLED=false
```

Start and reset the local backend:

```bash
supabase start
supabase db reset
```

Serve the Edge Functions locally with the `.env` file:

```bash
npm run agent:functions:local
```

In a second terminal, run the live agent harness:

```bash
npm run agent:test:local
```

The harness seeds a local provider, sends FAQ-hit and FAQ-miss messages, and
expects the FAQ miss to produce a pending draft with `response_source='llm'`
when OpenRouter is configured. If the function falls back instead, it prints
the latest `llm_called` event detail from `agent_events`.

## Web export / run
```bash
npm run build:web
npm start
```
Then open `http://localhost:3000`.

## Dev: bypass the paywall during onboarding/setup
Set this in `.env` before starting the dev server:

```bash
EXPO_PUBLIC_BYPASS_PAYWALL=true
```

With that enabled, the app treats the session as entitled and skips the purchase/subscription gate. Keep it unset in production/App Store builds.

## Playwright live validation
Install the browser once:

```bash
npm run e2e:install
```

Start the app with the bypass flag already in `.env`:

```bash
npm run dev
```

Then run the visible paywall flow validation:

```bash
npm run e2e:paywall
```

For a slower visible run:

```bash
npm run e2e:paywall:slow
```

For one CI-friendly live validation pass across Channels, Inbox approval, and
Thread approval:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:smoke:headless
```

Use `npm run e2e:smoke` to watch it live or `npm run e2e:smoke:slow` for a
slower visible pass.

For the core agent contract without forcing paid LLM usage:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:agent-contract:headless
```

That runs:
- `e2e:faq-hit`: exact FAQ match auto-sends immediately
- `e2e:faq-miss`: non-FAQ inbound shows a neutral receipt and holds the draft

For the low-cost provider settings surfaces:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:settings-surfaces:headless
```

That runs:
- `e2e:billing`: seeded plan and usage rendering
- `e2e:payments`: payment handle save and client-view validation
- `e2e:upload`: training import with a stubbed webhook
- `e2e:public-profile`: profile edits reflected on the public page, plus webchat handoff
- `e2e:public-profile-unpublished`: unpublished profile details stay hidden
- `e2e:public-profile-age-gate`: age-gated profile details stay hidden until confirmation
- `e2e:public-profile-no-age-gate`: non-age-gated public profiles render directly

For the next workspace flow after onboarding:

```bash
npm run e2e:webchat
```

That flow logs into the seeded provider account, completes onboarding only if
needed, ensures web chat is enabled, opens the public widget, sends one seeded
FAQ message, and checks that Inbox shows the new work. It uses the provider
from `scripts/seed-users.mjs` (`provider@nightime.local` / `provider1`) so it
does not consume signup attempts or hit auth rate limits.

To check the required remote functions without launching Playwright:

```bash
npm run e2e:verify:webchat
```

To isolate the provider-side Channels screen only:

```bash
npm run e2e:channels
```

That test logs into the seeded provider account and fails if the Channels page
stays on `Loading` instead of rendering a ready state.

To validate thread detail and approval end-to-end:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:thread
```

That test sends one real inbound web-chat message, opens the matching Inbox
thread, approves the pending draft, and verifies the approved reply shows up in
the public widget.

To validate Inbox approval end-to-end:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:inbox
```

That test sends one real inbound web-chat message, approves the matching draft
from the Inbox approval queue, and verifies the approved reply shows up in the
public widget.

To validate exact FAQ auto-send:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:faq-hit
```

To validate FAQ miss -> neutral receipt -> pending approval:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:faq-miss
```

To validate the dashboard pending-approval card routes into Inbox:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:dashboard-card
```

To validate a provider-written manual reply from thread detail:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:manual-reply
```

To validate that disabling a saved FAQ in Agent Settings changes live webchat behavior:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:ai-settings-faq-toggle
```

To validate that changing the public profile slug updates webchat routing:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:profile-slug
```

To validate that profile edits show up on the public profile page and hand off to web chat:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:public-profile
```

To validate that unpublished public profiles do not leak provider details:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:public-profile-unpublished
```

To validate that age-gated public profile details stay hidden until confirmation:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:public-profile-age-gate
```

To validate that public profiles without an age gate render directly:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:public-profile-no-age-gate
```

To validate that the Calendar reflects seeded bookings correctly:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:calendar
```

To validate the payment-links save and client-view flow:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:payments
E2E_BASE_URL=http://localhost:8081 npm run e2e:billing
E2E_BASE_URL=http://localhost:8081 npm run e2e:upload
```

Useful options:

```bash
E2E_BASE_URL=http://localhost:8081 npm run e2e:paywall
E2E_SLOWMO_MS=2000 npm run e2e:paywall
E2E_HEADLESS=true npm run e2e:paywall
E2E_KEEP_OPEN=true npm run e2e:paywall
E2E_BASE_URL=http://localhost:8081 npm run e2e:webchat
E2E_BASE_URL=http://localhost:8081 npm run e2e:smoke:headless
E2E_BASE_URL=http://localhost:8081 npm run e2e:agent-contract:headless
E2E_BASE_URL=http://localhost:8081 npm run e2e:settings-surfaces:headless
E2E_HEADLESS=true npm run e2e:faq-hit
E2E_HEADLESS=true npm run e2e:faq-miss
E2E_HEADLESS=true npm run e2e:dashboard-card
E2E_HEADLESS=true npm run e2e:manual-reply
E2E_HEADLESS=true npm run e2e:ai-settings-faq-toggle
E2E_HEADLESS=true npm run e2e:profile-slug
E2E_HEADLESS=true npm run e2e:public-profile
E2E_HEADLESS=true npm run e2e:public-profile-unpublished
E2E_HEADLESS=true npm run e2e:public-profile-age-gate
E2E_HEADLESS=true npm run e2e:public-profile-no-age-gate
E2E_HEADLESS=true npm run e2e:calendar
E2E_HEADLESS=true npm run e2e:payments
E2E_HEADLESS=true npm run e2e:billing
E2E_HEADLESS=true npm run e2e:upload
E2E_SLOWMO_MS=1200 npm run e2e:inbox
E2E_HEADLESS=true npm run e2e:inbox
E2E_SLOWMO_MS=1200 npm run e2e:thread
E2E_HEADLESS=true npm run e2e:thread
E2E_HEADLESS=true npm run e2e:webchat
```

Screenshots and console logs are written to `test-results/playwright/`.

## Refreshing the graph snapshot
```bash
graphify update .
```

## What’s included
- Landing + auth + provider onboarding
- Dashboard, Inbox, Thread, Channels, Calendar
- Agent settings, Billing, Profile, Payments, Upload
- Demo mode when Supabase env is missing
