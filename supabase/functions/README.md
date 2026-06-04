# Agent runtime — Supabase Edge Functions (Phase 2)

The message loop that turns Nightime Agent from a demo into a thing that
processes a real message.

```
Telegram / WhatsApp / web chat / Google Voice-over-Gmail
  → channel webhook → FAQ pre-filter (free) → LLM fallback (Haiku, optional)
  → messages (inbound + draft) → approval queue → send-draft → channel delivery
```

## Functions

| Function           | verify_jwt | Purpose                                                            |
| ------------------ | ---------- | ----------------------------------------------------------------- |
| `telegram-webhook` | **false**  | Inbound webhook. Resolves provider by secret, drafts a reply.     |
| `whatsapp-webhook` | **false**  | Meta Cloud API webhook. Resolves provider by phone number id.     |
| `send-draft`       | **true**   | Provider approves a pending draft → delivers it through its channel. |
| `webchat-inbound`  | **false**  | Public widget inbound; returns only visible/eligible replies.      |
| `webchat-poll`     | **false**  | Public widget polling for visible replies in one thread.           |
| `google-voice-webhook` | **false** | Gmail Pub/Sub push for Google Voice notification emails.       |

Pure, shared logic lives in `_shared/` (`agentLogic.ts`, `telegramParser.ts`)
and is unit-tested by vitest (`npm test`). The IO modules (`telegram.ts`,
`llm.ts`) only run in Deno.

## Cost model

The FAQ pre-filter is free and handles most messages. The cheap model
(`claude-haiku-4-5`) is only called on an FAQ miss, and only when
`ANTHROPIC_API_KEY` is set — without it the runtime still works and uses a
deterministic holding reply. Telegram has no per-message fee. Google Voice is
treated as interactive messaging only; avoid bulk sends or repeated unsolicited
messages.

## Deploy

```bash
# 1. Apply the migration (session pooler — see PLAN.md gotcha)
supabase db push --db-url "$(echo "$DATABASE_URL" | sed 's/:6543/:5432/')"

# 2. Set secrets (server-side; never EXPO_PUBLIC_)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   # optional, enables LLM fallback
#   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

# 3. Deploy
supabase functions deploy telegram-webhook
supabase functions deploy whatsapp-webhook
supabase functions deploy send-draft
supabase functions deploy webchat-inbound
supabase functions deploy webchat-poll
supabase functions deploy google-voice-webhook

# 4. Connect provider channels:
node scripts/connect-telegram.mjs <botToken> [providerEmail]
node scripts/connect-whatsapp.mjs <phoneNumberId> <accessToken> [providerEmail]
```

`verify_jwt` per function is configured in `supabase/config.toml`.

## Try the loop

1. Create a bot with [@BotFather](https://t.me/BotFather), copy the token.
2. `node scripts/connect-telegram.mjs <token> test@nightime.local`.
3. Message the bot — the inbound + a draft reply land in the provider's Inbox
   under **Needs your approval**. Approve to send it back through Telegram.
4. Set the provider's `approval_mode` to `auto_eligible` to let confident FAQ
   answers send automatically.

## WhatsApp Cloud API

1. Create/configure a WhatsApp Business Platform app in Meta.
2. Set Supabase secrets:

```bash
supabase secrets set WHATSAPP_VERIFY_TOKEN=... WHATSAPP_APP_SECRET=...
```

3. Deploy `whatsapp-webhook`, then configure Meta's webhook callback URL:
   `https://<ref>.functions.supabase.co/whatsapp-webhook`.
4. Subscribe the app to the WhatsApp `messages` webhook field.
5. Store the provider's phone-number access token and phone number id:

```bash
node scripts/connect-whatsapp.mjs <phoneNumberId> <accessToken> [providerEmail]
```

Inbound free-form replies work inside WhatsApp's customer-service window.
Provider-initiated outbound messages need approved WhatsApp templates; do not
use this runtime for cold or bulk outreach.

## Google Voice via Gmail

There is no direct Google Voice SMS API here. The supported path is:

1. Enable Google Voice/Gmail notifications for the provider mailbox.
2. Create a Google Cloud Pub/Sub topic + push subscription pointed at
   `https://<ref>.functions.supabase.co/google-voice-webhook`.
3. Grant `gmail-api-push@system.gserviceaccount.com` publish access to the topic.
4. Store a Gmail OAuth refresh token with Gmail read/send scopes and start the
   mailbox watch:

```bash
supabase secrets set GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=...
node scripts/connect-google-voice.mjs <gmailAddress> <refreshToken> [providerEmail]
```

Gmail watches expire, so run the connect script again at least daily or add a
scheduled renewal job before production.
