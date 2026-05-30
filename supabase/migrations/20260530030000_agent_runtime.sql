/*
  # Agent runtime (Phase 2)

  Backs the message loop:
    1. An approval queue layered onto `messages` (an agent draft is an outbound,
       ai_generated message with an `approval_status`).
    2. `agent_channels` — per-provider channel credentials + the webhook secret
       used to authenticate inbound calls and resolve the owning provider.
    3. `agent_events` — a lightweight observability/audit log.

  The Edge Functions use the service role and bypass RLS. Clients only ever read
  their own rows, and must never select `bot_token` / `webhook_secret`.
*/

-- Shared trigger (already defined in the provider_preferences migration; redefined
-- here so this migration is self-contained if applied independently).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Approval queue on messages -------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS approval_status text
    CHECK (approval_status IS NULL OR approval_status IN
      ('pending', 'approved', 'rejected', 'sent', 'auto_sent', 'failed')),
  ADD COLUMN IF NOT EXISTS response_source text
    CHECK (response_source IS NULL OR response_source IN ('faq', 'llm', 'fallback')),
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid
    REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Partial index: the approval queue only ever scans pending drafts.
CREATE INDEX IF NOT EXISTS idx_messages_approval_pending
  ON public.messages(user_id, created_at DESC)
  WHERE approval_status = 'pending';

-- 2. Per-provider channel connections -------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('gv', 'telegram', 'whatsapp', 'email', 'sms')),
  external_account_id text,        -- e.g. bot username / phone number id
  bot_token text,                  -- server-side secret; never selected by clients
  webhook_secret text NOT NULL,    -- matches X-Telegram-Bot-Api-Secret-Token
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_channels_webhook_secret
  ON public.agent_channels(webhook_secret);

ALTER TABLE public.agent_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_channels_manage_self" ON public.agent_channels;
CREATE POLICY "agent_channels_manage_self"
  ON public.agent_channels FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS set_agent_channels_updated_at ON public.agent_channels;
CREATE TRIGGER set_agent_channels_updated_at
  BEFORE UPDATE ON public.agent_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Event log ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.threads(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  kind text NOT NULL,              -- inbound_received | prefilter_hit | llm_called | draft_created | auto_sent | sent | error
  source text,                     -- faq | llm | fallback | approval
  intent text,
  confidence numeric(3, 2),
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_user_id ON public.agent_events(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON public.agent_events(created_at DESC);

ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_events_select_self" ON public.agent_events;
CREATE POLICY "agent_events_select_self"
  ON public.agent_events FOR SELECT
  USING (user_id = auth.uid());
