# nitime Core Features

> Current product state as of June 26, 2026. This document describes what the
> app actually contains today, plus explicitly labeled gaps and gated future
> work. For repo conventions see `AGENTS.md`; for visual conventions see
> `DESIGN_SYSTEM.md`; for release planning see the App Store and deployment docs.

## Product in one line

nitime is a provider-controlled messaging workspace: it connects a provider's
own client channels, drafts replies, lets the provider approve or reject those
drafts, and keeps direct payments and provider/client service delivery outside
the platform.

## Product boundaries

- nitime is a tool, not a marketplace. It does not sell provider services, hold
  client funds, escrow payments, confirm a booking of record, or run public
  provider discovery.
- Direct payment links are allowed because they point to the provider's own
  PayPal, Venmo, Cash App, or Zelle handles. Money never moves through nitime.
- Public profile pages exist only as a lightweight provider profile and web-chat
  entry point. They are not a directory, checkout, or self-serve booking flow.
- Booking tables and calendar views exist as provider workflow context. Any
  marketplace-style booking or checkout expansion remains a deliberate future
  decision.

## Current surfaces

| Surface | Route or location | Current role |
|---|---|---|
| Landing page | `/` | Public marketing page, provider signup/login, client/provider intent capture, cookie consent |
| Auth | `app/(auth)` and landing modal | Supabase email/password, Google auth path, demo fallback when Supabase is absent |
| Onboarding | `app/(onboarding)` | Conversion diagnostic, StoreKit/web/demo entitlement gate, handoff to dashboard |
| Provider app | `app/(tabs)` | Dashboard, inbox, thread review, calendar, channels, settings, billing, profile, uploads, direct payment links |
| Public profile | `/p/[slug]` | Published profile shell with age gate and web-chat entry point |
| Web chat widget | `public/chat.html` | Embeddable client chat UI that posts to Supabase Edge Functions |
| Agent runtime | `supabase/functions` | Channel webhooks, FAQ prefilter, optional LLM fallback, draft queue, channel delivery |

## Implemented app features

### Landing and auth

- Signed-out `/` renders a branded landing page with night-sky hero, app mockup,
  provider CTA, client updates CTA, footer links, SEO metadata, and cookie
  consent.
- Provider signup creates/uses Supabase auth when configured, records landing
  intent best-effort, resets onboarding completion, and routes into onboarding.
- Client signup currently records intent only; client account/portal access is
  not implemented.
- Signed-in users are routed by access state: onboarding first, then pricing if
  no entitlement, then dashboard.
- Demo mode remains explorable without Supabase using local/mock data where
  practical.

### Onboarding and subscription gate

- Onboarding uses `ConversionOnboardingFlow`, a multi-step diagnostic covering
  provider type, channels, message volume, reply speed, client value, FAQ
  categories, approval mode, result, trial education, paywall, handoff, and a
  dashboard preview.
- The onboarding brand lockup is `nitime` only, with no `ai` suffix.
- Access state combines local onboarding completion with durable subscription
  entitlement records. A recorded or active entitlement marks onboarding
  complete for that user.
- StoreKit product ids default to `nitime_annual` and `nitime_monthly`.
  Entitlements are persisted in `subscription_entitlements` and locally in
  AsyncStorage. Web trial, demo entitlement, and dev bypass paths exist for
  non-iOS flows and testing.
- Entitlement grant updates the profile plan to `premium` for annual or `pro`
  for monthly.

### Provider dashboard

- Dashboard shows provider operations overview, auto-send toggle, pending draft
  warning, daily stats, connected channel status, and quick actions.
- Live stats come from `messages` and `bookings`: messages today, bookings this
  week, AI replies today, and AI response rate.
- Auto-send writes `provider_preferences.approval_mode` as `auto_eligible` or
  `manual`.
- Channel rows are read from `agent_channels`; active, paused, and empty states
  are represented.

### Inbox and thread review

- Inbox lists provider threads from `threads` with latest message preview,
  unread heuristic, channel badge, and derived type (`manual`, `ai`, or
  `booking`).
- Pending outbound drafts from `messages.approval_status = 'pending'` appear in
  a "Needs your approval" queue with source, intent, confidence context, inbound
  message excerpt, and draft text.
- Providers can approve and send a draft through the `send-draft` Edge Function
  or reject it so it never sends.
- Thread detail shows the full message history, AI/source badges, pending/failed
  draft review controls, rejected state, and a manual reply composer.
- Manual provider replies are inserted as pending outbound messages and then
  delivered through the same `send-draft` path. If delivery fails, the reply is
  retained in the approval queue.

### Agent settings

- Saved responses are backed by the `faq` table. Providers can list, add, enable
  or disable, and delete reusable responses.
- Automation controls include auto-send for confident saved-response matches and
  moderation level (`low`, `medium`, `strict`) on `provider_preferences`.
- Current UI does not yet edit full persona/system prompt, response boundaries,
  LLM enablement, or budget caps, though the runtime reads several of those
  fields when present.

### Channels

- Web chat is self-serve. Enabling it ensures the provider has a valid public
  slug, upserts an `agent_channels` row, and exposes a shareable link plus iframe
  embed snippet.
- Telegram is self-serve. The provider pastes a BotFather token, the app
  validates it with Telegram, stores the channel row, and registers the webhook.
- WhatsApp and Google Voice are visible as assisted setup channels. Runtime code
  and support scripts exist, but app-level self-serve credential setup is not
  implemented.
- Channels can be paused/resumed or disconnected. Client-side reads only safe
  channel columns; secrets such as bot tokens and webhook secrets are not shown.

### Public profile and web chat

- `/p/[slug]` reads `public_provider_profiles` and renders the provider display
  name, handle, headline, location label, optional age confirmation gate, and a
  web-chat CTA.
- The public profile requires Supabase. Without Supabase it shows an unavailable
  state.
- `public/chat.html` is a standalone, embeddable chat UI. It stores a per-slug
  client session id locally, posts inbound messages to `webchat-inbound`, polls
  `webchat-poll`, and displays an AI disclosure.
- Web-chat replies are only visible when they are auto-sent FAQ replies or
  provider-approved/sent messages. Pending, rejected, and failed drafts are not
  exposed to visitors.

### Calendar

- Calendar reads upcoming `bookings` for the provider and shows today's
  appointment count, minutes booked, unique clients, schedule rows, and a simple
  availability slot display.
- The `Add` button is present but manual booking creation is not implemented in
  the current UI.
- Booking records are context for provider workflow; there is no client-facing
  self-serve booking flow.

### Profile, settings, support, and feedback

- Profile editing updates business name, display name, headline, location label,
  and public chat handle/slug.
- Settings groups account links, business tools, automation preferences,
  privacy/help copy, in-app feedback, and sign out.
- Notification and follow-up toggles write `provider_preferences` when Supabase
  is configured.
- `FeedbackWidget` creates support feedback/tickets through `utils/supportFeedback`.
- Support, privacy, and terms routes are implemented in the Expo app.

### Billing and direct payment links

- Billing screen shows early-access status, current plan from `profiles.plan`,
  monthly usage from `profiles.usage_month_count` and `usage_limit`, planned
  launch tiers, and "no payment method needed yet" copy.
- Paid checkout is not implemented in the provider app. StoreKit/paywall
  entitlement logic exists in onboarding/subscription utilities.
- Payment links are a direct provider tool, stored locally with AsyncStorage.
  Providers can enter PayPal, Venmo, Cash App, and Zelle handles, then show a
  client view with QR codes/open links. nitime does not process those payments.

### Training imports

- Training imports accept WhatsApp text, email text/CSV, and Telegram JSON/text
  exports via Expo DocumentPicker.
- Files are parsed client-side, converted into local training data, and shown in
  a recent-imports list.
- Imported conversations are not yet persisted to Supabase or wired into
  retrieval for runtime generation.

## Agent runtime

### Shared message loop

All supported inbound channels run the same core flow:

1. Resolve the provider/channel and upsert a `threads` row.
2. Insert the inbound `messages` row.
3. Load `provider_preferences`, enabled `faq` entries, and profile context.
4. Run deterministic intent classification, moderation screening, and FAQ
   matching in `_shared/agentLogic.ts`.
5. If a saved response matches confidently, use it as the draft.
6. If no FAQ matches and LLM is enabled and under configured caps, call the LLM
   helper; otherwise use a deterministic fallback reply.
7. Insert an outbound draft message with source, intent, confidence,
   `approval_status`, and `reply_to_message_id`.
8. Auto-send only confident FAQ replies when approval mode permits it; otherwise
   hold the draft for provider approval.
9. Log agent events and update thread state/activity.

### Runtime functions

| Function | Purpose |
|---|---|
| `telegram-webhook` | Telegram inbound webhook, provider resolved by webhook secret |
| `whatsapp-webhook` | Meta WhatsApp Cloud API webhook, provider resolved by phone number id |
| `google-voice-webhook` | Gmail Pub/Sub push for Google Voice notification emails |
| `webchat-inbound` | Public web-chat inbound endpoint |
| `webchat-poll` | Public web-chat polling endpoint for visible replies |
| `send-draft` | Authenticated provider approval/delivery endpoint |
| `connect-channel` | Server-side channel connection helper for selected channel setup paths |

### Safety, moderation, cost, and delivery

- FAQ matching and intent classification are dependency-free and covered by
  Vitest.
- Moderation flags underage/illegal terms at all levels and adds stricter terms
  at `strict`. Flagged messages never auto-send.
- LLM fallback defaults to server-side OpenRouter configuration when enabled.
  Without a usable LLM path, the runtime still creates a safe holding draft.
- Agent cost metadata is logged in `agent_events`; provider preferences include
  daily, monthly, and per-thread AI cap fields.
- Telegram, WhatsApp, Google Voice, and web chat differ only in transport.
  Web chat "delivery" is database visibility through polling.

## Data model snapshot

Primary provider-owned tables and views used by the current app:

- `profiles`: provider identity, plan, usage, slug, display/public profile fields.
- `provider_preferences`: approval mode, moderation, notification/follow-up
  toggles, LLM/cost cap fields, and related automation settings.
- `faq`: saved responses used by the free prefilter.
- `agent_channels`: provider channel credentials/state; client reads safe
  columns only.
- `threads`: provider/client conversation containers.
- `messages`: inbound messages, outbound drafts, approval status, AI metadata,
  reply linkage, and delivery metadata.
- `bookings`: upcoming appointment/context rows used by calendar and stats.
- `agent_events`: observability, model/cost metadata, and agent audit trail.
- `subscription_entitlements`: StoreKit/web/demo entitlement records.
- `landing_intents`: provider/client landing signup intent capture.
- `public_provider_profiles`: public-safe profile projection for `/p/[slug]`.

Public service listing, availability, and payment-ready booking columns exist in
the schema for optionality, but current UI does not ship marketplace discovery,
client booking, or platform-managed payments.

## Explicit gaps and future work

- Self-serve WhatsApp and Google Voice setup in the app.
- Provider-editable persona, boundaries, LLM enablement, and AI budget caps.
- Persistent training import storage and retrieval-backed generation.
- Manual booking creation from calendar.
- Push notifications for drafts needing approval, channel errors, and handoffs.
- Production subscription checkout/restore polish across all target platforms.
- Scheduled follow-up/re-engagement jobs.
- Public directory, client self-serve booking, and platform-managed service
  payments remain gated marketplace work and should not be built without an
  explicit product/legal decision.

## Non-goals for the current app

- Marketplace discovery or public multi-provider directory.
- Selling, processing, escrowing, refunding, or mediating client service
  payments.
- Client account system.
- Cold outbound prospecting.
- Native-only workflows that cannot work through Expo web export.
