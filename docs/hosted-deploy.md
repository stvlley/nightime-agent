# Hosted deploy runbook (Supabase + Vercel)

End-to-end deploy of the agent runtime to the **hosted** Supabase project and the
provider app to Vercel. Everything below has been verified on the local stack;
this promotes it to production.

- Supabase project ref: **`hwcpztsltgpjzclrmyez`** (org `gay-copper-nm3ssps`).
- Provider app (Vercel): `nitime.app` after Cloudflare DNS; current working
  Vercel alias is `nightime-agent.vercel.app`.

> **Auth required.** The CLI must be logged in. In this Claude Code session you
> can run the interactive login yourself by typing:
> `! supabase login`
> (or set `SUPABASE_ACCESS_TOKEN=<token>` from the Supabase dashboard →
> Account → Access Tokens). Once authenticated, the steps below can be run for you.

---

## 1. Link the project

```bash
supabase link --project-ref hwcpztsltgpjzclrmyez
```

## 2. Apply migrations

`db push` applies every file in `supabase/migrations/` to the hosted DB.

```bash
supabase db push
```

**Pooler gotcha (from LOG):** if you pass an explicit `--db-url`, use the
**session pooler (port 5432)**, not the transaction pooler (6543) — 6543 breaks
the CLI's prepared statements ("prepared statement already exists"):

```bash
supabase db push --db-url "$(echo "$DATABASE_URL" | sed 's/:6543/:5432/')"
```

Migrations currently applied remotely: base schema through
`20260615020000_web_trial_entitlements.sql`.

## 3. Set Edge Function secrets

The platform auto-injects `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` into functions. Set the rest (all optional except
where a feature needs it):

```bash
supabase secrets set \
  AGENT_LLM_DISABLED=true         \  # cost-first TestFlight default
  AGENT_LLM_MAX_TOKENS=180        \  # hard cap remains 320 in code
  ANTHROPIC_API_KEY=...            \  # smart-reply drafting (else deterministic fallback)
  GOOGLE_TRANSLATE_API_KEY=...     \  # auto-translation (cheapest engine; else passthrough)
  GOOGLE_OAUTH_CLIENT_ID=...       \  # Google Voice / Gmail (same client as Supabase Google login)
  GOOGLE_OAUTH_CLIENT_SECRET=...   \
  GOOGLE_PUBSUB_TOPIC=projects/<gcp>/topics/<topic>
```

See `docs/google-voice-setup.md` for the Google/Pub/Sub side.

## 4. Deploy Edge Functions

`config.toml` already sets `verify_jwt` per function (public webhooks false;
`send-draft` + `connect-channel` true). Deploy all:

```bash
supabase functions deploy telegram-webhook
supabase functions deploy whatsapp-webhook
supabase functions deploy webchat-inbound
supabase functions deploy webchat-poll
supabase functions deploy google-voice-webhook
supabase functions deploy send-draft
supabase functions deploy connect-channel
```

(or `supabase functions deploy` to push them all at once).

Current production status: all functions above are active on project
`hwcpztsltgpjzclrmyez`.

## 4.5 Point `nitime.app` DNS

Vercel already has `nitime.app` and `www.nitime.app` attached to the
`nightime-agent` project. Cloudflare still needs:

```text
A nitime.app 76.76.21.21
A www.nitime.app 76.76.21.21
```

## 5. Point inbound webhooks

- **Web chat:** nothing to do — the widget calls `webchat-inbound`/`webchat-poll`
  directly by slug.
- **Telegram:** handled automatically when a provider connects in
  Settings → Channels (the `connect-channel` function calls `setWebhook` at
  `https://<ref>.functions.supabase.co/telegram-webhook`). Confirm the function
  base resolves on hosted.
- **WhatsApp:** in the Meta app dashboard, set the webhook callback URL to
  `https://<ref>.functions.supabase.co/whatsapp-webhook` and the verify token to
  match the function; subscribe to `messages`.
- **Google Voice:** Pub/Sub push subscription → `google-voice-webhook`
  (see `docs/google-voice-setup.md`).

## 6. Provider app env (Vercel)

Set on the Vercel project (Production):

```
EXPO_PUBLIC_SUPABASE_URL=https://hwcpztsltgpjzclrmyez.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<hosted anon key>
```

Redeploy: push to the connected branch, or `vercel --prod`. Build = `npm run
build:web`, output `dist` (see `vercel.json`).

## 7. Seed a provider (optional, for a real run)

`scripts/seed-users.mjs` + `scripts/enable-webchat.mjs` work against whatever
`EXPO_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are in `.env`. Point
`.env` at the hosted project (URL + service-role key) and run them to create
`provider@nightime.local` / `provider1` with demo data + web chat.

## 8. End-to-end verification

1. Open the provider app (Vercel URL) → sign in.
2. Settings → **Channels** → enable web chat, copy the link.
3. Open the widget link, send "What are your rates?" → confirm auto-answer (FAQ +
   `auto_eligible`) or a held draft in the Inbox.
4. Approve a held draft → confirm delivery.
5. (If Google configured) text the Google Voice number → draft appears → approve →
   reply sent via Gmail.
6. (If a translate key is set) message in another language → you see English, the
   client gets their language.

## Rollback

- Functions: `supabase functions deploy <name>` from a previous commit, or
  redeploy the prior version.
- DB: migrations are forward-only; write a new corrective migration rather than
  editing an applied one.
- App: Vercel → Deployments → promote a previous deployment.
