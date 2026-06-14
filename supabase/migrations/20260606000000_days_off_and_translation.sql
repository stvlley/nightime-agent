/*
  Days off + auto-translation support.

  1. `time_off`: date-range blackouts a provider marks (vacation, sick, etc.).
     Owner-only RLS; the agent reads it via the service role to HOLD replies for
     approval while the provider is away (and to give the model context).

  2. `messages.original_text` / `messages.lang`: when a client writes in another
     language we translate inbound → English for the provider, and the provider's
     English reply → the client's language for delivery. `text` always holds the
     PROVIDER-language (English) version so the provider app reads everything in
     one language; `original_text` holds the client-language version (what the
     client actually wrote / what we actually deliver to them); `lang` is the
     detected client language code (null/'en' = no translation).

  3. `provider_preferences.auto_translate_enabled`: per-provider switch (default
     on) so the translation calls only run when wanted.
*/

-- 1. Days off ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT time_off_range_valid CHECK (end_date >= start_date)
);

ALTER TABLE public.time_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_off_manage_self" ON public.time_off;
CREATE POLICY "time_off_manage_self"
  ON public.time_off FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS time_off_user_range_idx
  ON public.time_off (user_id, start_date, end_date);

-- 2. Translation columns on messages -----------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS original_text text,
  ADD COLUMN IF NOT EXISTS lang text;

-- 3. Per-provider translation switch -----------------------------------------
ALTER TABLE public.provider_preferences
  ADD COLUMN IF NOT EXISTS auto_translate_enabled boolean NOT NULL DEFAULT true;
