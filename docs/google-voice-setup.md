# Google Voice ingestion setup (Gmail + Pub/Sub)

Google Voice has no public SMS API, so Nitime ingests Google Voice texts **over
Gmail**: Google Voice forwards each SMS to your Gmail inbox (from
`…@txt.voice.google.com`), Gmail pushes a notification to a Pub/Sub topic, the
`google-voice-webhook` Edge Function reads the new mail and runs the agent loop,
and replies are sent back through Gmail.

This is the last credential-gated mile. Everything in the app/runtime is already
wired (`connect-channel` google action, `_shared/gmail.ts`,
`google-voice-webhook`). You only need to provision the Google side and set three
env vars.

> **One OAuth client for both jobs.** The refresh token captured at Google
> **sign-in** (Supabase external Google provider) is later exchanged server-side
> by `connect-channel` / `gmail.ts` using `GOOGLE_OAUTH_CLIENT_ID` /
> `GOOGLE_OAUTH_CLIENT_SECRET`. Those **must be the same OAuth client** that
> Supabase uses for Google login, or the exchange fails (`invalid_client`). Use
> one client ID/secret in all three places: Supabase Auth → Google provider, and
> the two `GOOGLE_OAUTH_*` env vars.

---

## 1. Google Cloud project + OAuth client

1. Create (or reuse) a Google Cloud project.
2. **APIs & Services → Enable APIs:** enable **Gmail API** and **Cloud Pub/Sub
   API**.
3. **OAuth consent screen:**
   - User type: External.
   - Add scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`,
     `https://www.googleapis.com/auth/gmail.readonly`,
     `https://www.googleapis.com/auth/gmail.send`.
   - `gmail.readonly` and `gmail.send` are **restricted scopes** → for production
     you must pass Google's OAuth verification (security assessment). For testing,
     keep the app in **Testing** mode and add your provider Google accounts as
     **Test users** (note: in Testing mode refresh tokens expire after **7 days**).
4. **Credentials → Create OAuth client ID → Web application:**
   - Authorized redirect URI: your Supabase callback
     `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.
   - Save the **Client ID** and **Client secret**.

## 2. Wire the client into Supabase + env

- **Supabase Auth → Providers → Google:** enable, paste the Client ID + secret.
  (Or via `supabase/config.toml` `[auth.external.google]`, which reads
  `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET`.)
- **Edge Function secrets** (server-side; same client):
  ```
  GOOGLE_OAUTH_CLIENT_ID=<client id>
  GOOGLE_OAUTH_CLIENT_SECRET=<client secret>
  ```

The app already requests the Gmail scopes at sign-in (`hooks/useAuth.tsx`
`GOOGLE_SCOPES`, `access_type=offline`, `prompt=consent`), so a provider who signs
in with Google grants ingestion in the same step.

## 3. Pub/Sub topic + push subscription

```bash
# Variables
PROJECT=<gcp-project-id>
TOPIC=nitime-gmail
FN_URL=https://<PROJECT_REF>.functions.supabase.co/google-voice-webhook

# Create the topic
gcloud pubsub topics create "$TOPIC" --project "$PROJECT"

# Let Gmail publish to it (required, exact service account)
gcloud pubsub topics add-iam-policy-binding "$TOPIC" --project "$PROJECT" \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Push subscription → the deployed Edge Function (verify_jwt=false, public)
gcloud pubsub subscriptions create nitime-gmail-push --project "$PROJECT" \
  --topic="$TOPIC" \
  --push-endpoint="$FN_URL"
```

Then set the Edge Function secret:
```
GOOGLE_PUBSUB_TOPIC=projects/<gcp-project-id>/topics/nitime-gmail
```

## 4. Google Voice: forward SMS to Gmail

In **Google Voice → Settings → Messages**: enable **"Forward messages to email."**
This is what makes inbound texts arrive in Gmail from `…@txt.voice.google.com`,
which the webhook parses.

## 5. Connect the channel

Either path stores the Gmail refresh token server-side and starts the Gmail
`watch()` (recording the baseline `historyId` in `agent_channels.metadata`):

- **In-app (preferred):** Settings → **Channels** → **Connect Google**. Sign-in
  re-consents with the Gmail scopes; the app captures the refresh token and calls
  `connect-channel` (`action: 'google'`).
- **Script:** with `GOOGLE_OAUTH_*` + `GOOGLE_PUBSUB_TOPIC` set and a refresh
  token in `.env`, run `node scripts/connect-google-voice.mjs <gmailAddress>`.

## 6. Verify

1. Text the provider's Google Voice number from another phone.
2. Google Voice → Gmail → Pub/Sub → `google-voice-webhook` runs the loop; a draft
   appears in the provider app **Inbox → Needs your approval** (or auto-sends if
   it's a confident FAQ under `auto_eligible`).
3. Approve it → the reply is sent back through Gmail to the Google Voice thread.

## Operational notes

- **Gmail `watch()` expires within 7 days** — renew it at least daily. Add a
  scheduled renewal (Supabase `pg_cron` calling a renew function, or a cron that
  re-runs the connect step). Until that exists, re-connect weekly.
- **Testing-mode refresh tokens expire after 7 days** — for anything beyond a pilot,
  complete Google's restricted-scope verification so tokens are long-lived.
- Auto-translation applies to Google Voice too (inbound → English for you, your
  reply → the client's language) when `GOOGLE_TRANSLATE_API_KEY` (or
  `OPENROUTER_API_KEY`) is set.
