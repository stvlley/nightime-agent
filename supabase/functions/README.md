# Agent runtime — Supabase Edge Functions (Phase 2)

The message loop that turns Nightime Agent from a demo into a thing that
processes a real message.

```
Telegram → telegram-webhook → FAQ pre-filter (free) → LLM fallback (Haiku, optional)
         → messages (inbound + draft) → approval queue → send-draft → Telegram
```

## Functions

| Function           | verify_jwt | Purpose                                                            |
| ------------------ | ---------- | ----------------------------------------------------------------- |
| `telegram-webhook` | **false**  | Inbound webhook. Resolves provider by secret, drafts a reply.     |
| `send-draft`       | **true**   | Provider approves a pending draft → sends it via the bot.         |

Pure, shared logic lives in `_shared/` (`agentLogic.ts`, `telegramParser.ts`)
and is unit-tested by vitest (`npm test`). The IO modules (`telegram.ts`,
`llm.ts`) only run in Deno.

## Cost model

The FAQ pre-filter is free and handles most messages. The cheap model
(`claude-haiku-4-5`) is only called on an FAQ miss, and only when
`ANTHROPIC_API_KEY` is set — without it the runtime still works and uses a
deterministic holding reply. Telegram has no per-message fee.

## Deploy

```bash
# 1. Apply the migration (session pooler — see PLAN.md gotcha)
supabase db push --db-url "$(echo "$DATABASE_URL" | sed 's/:6543/:5432/')"

# 2. Set secrets (server-side; never EXPO_PUBLIC_)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   # optional, enables LLM fallback
#   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

# 3. Deploy
supabase functions deploy telegram-webhook
supabase functions deploy send-draft

# 4. Connect a provider's bot (creates @BotFather bot first, then):
node scripts/connect-telegram.mjs <botToken> [providerEmail]
```

`verify_jwt` per function is configured in `supabase/config.toml`.

## Try the loop

1. Create a bot with [@BotFather](https://t.me/BotFather), copy the token.
2. `node scripts/connect-telegram.mjs <token> test@nightime.local`.
3. Message the bot — the inbound + a draft reply land in the provider's Inbox
   under **Needs your approval**. Approve to send it back through the bot.
4. Set the provider's `approval_mode` to `auto_eligible` to let confident FAQ
   answers send automatically.
