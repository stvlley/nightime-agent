/*
  # AI usage ledger and provider caps

  Adds explicit, append-only cost metadata to agent_events and provider-owned
  controls for enabling LLM drafts. AGENT_LLM_DISABLED remains the global kill
  switch; llm_enabled is the per-provider opt-in and defaults false.
*/

ALTER TABLE public.provider_preferences
  ADD COLUMN IF NOT EXISTS llm_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_daily_cap_cents integer NOT NULL DEFAULT 0
    CHECK (ai_daily_cap_cents >= 0),
  ADD COLUMN IF NOT EXISTS ai_monthly_cap_cents integer NOT NULL DEFAULT 0
    CHECK (ai_monthly_cap_cents >= 0),
  ADD COLUMN IF NOT EXISTS ai_thread_cap_cents integer NOT NULL DEFAULT 0
    CHECK (ai_thread_cap_cents >= 0),
  ADD COLUMN IF NOT EXISTS ai_cap_behavior text NOT NULL DEFAULT 'fallback'
    CHECK (ai_cap_behavior IN ('fallback'));

ALTER TABLE public.agent_events
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS input_tokens integer CHECK (input_tokens IS NULL OR input_tokens >= 0),
  ADD COLUMN IF NOT EXISTS output_tokens integer CHECK (output_tokens IS NULL OR output_tokens >= 0),
  ADD COLUMN IF NOT EXISTS estimated_cost_cents numeric(12, 4)
    CHECK (estimated_cost_cents IS NULL OR estimated_cost_cents >= 0),
  ADD COLUMN IF NOT EXISTS auto_send boolean,
  ADD COLUMN IF NOT EXISTS approval_status text;

CREATE INDEX IF NOT EXISTS idx_agent_events_usage_daily
  ON public.agent_events(user_id, created_at DESC)
  WHERE source = 'llm';

CREATE INDEX IF NOT EXISTS idx_agent_events_usage_thread
  ON public.agent_events(user_id, thread_id, created_at DESC)
  WHERE source = 'llm';
