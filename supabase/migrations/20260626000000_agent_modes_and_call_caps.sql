/*
  # Agent modes and model-call caps

  Adds provider-selectable automation levels plus explicit LLM call-count caps.
  Cost caps remain as a separate backstop.
*/

ALTER TABLE public.provider_preferences
  ADD COLUMN IF NOT EXISTS agent_mode text NOT NULL DEFAULT 'keep_up'
    CHECK (agent_mode IN ('keep_up', 'help_respond', 'talk_for_me')),
  ADD COLUMN IF NOT EXISTS ai_daily_call_cap integer
    CHECK (ai_daily_call_cap IS NULL OR ai_daily_call_cap >= 0),
  ADD COLUMN IF NOT EXISTS ai_monthly_call_cap integer
    CHECK (ai_monthly_call_cap IS NULL OR ai_monthly_call_cap >= 0),
  ADD COLUMN IF NOT EXISTS ai_thread_call_cap integer
    CHECK (ai_thread_call_cap IS NULL OR ai_thread_call_cap >= 0);

ALTER TABLE public.provider_preferences
  ALTER COLUMN llm_enabled SET DEFAULT true;
