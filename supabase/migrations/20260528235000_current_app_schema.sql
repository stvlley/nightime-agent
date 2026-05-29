/*
  # Current app schema

  Fresh-project schema for the Expo app's current Supabase types.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  business_name text,
  timezone text DEFAULT 'UTC',
  plan text DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'premium')),
  usage_month_count integer DEFAULT 0,
  usage_limit integer DEFAULT 100,
  fcm_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('gv', 'telegram', 'whatsapp', 'email', 'sms')),
  external_thread_id text,
  client_handle text,
  state text DEFAULT 'open' CHECK (
    state IN (
      'open',
      'qualifying',
      'offering',
      'awaiting_client',
      'tentative',
      'confirmed',
      'cancelled',
      'abandoned'
    )
  ),
  last_activity_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  thread_id uuid REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  text text,
  sender text,
  direction text CHECK (direction IS NULL OR direction IN ('in', 'out')),
  filtered_text text,
  is_voicemail boolean DEFAULT false,
  ai_label text,
  ai_generated boolean DEFAULT false,
  ai_confidence decimal(3,2),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.threads(id) ON DELETE SET NULL,
  calendar_event_id text,
  start timestamptz,
  "end" timestamptz,
  status text DEFAULT 'tentative' CHECK (
    status IN ('tentative', 'confirmed', 'cancelled', 'completed', 'no_show')
  ),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger text,
  reply_text text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "threads_select_self" ON public.threads;
DROP POLICY IF EXISTS "threads_insert_self" ON public.threads;
DROP POLICY IF EXISTS "threads_update_self" ON public.threads;
DROP POLICY IF EXISTS "threads_delete_self" ON public.threads;
DROP POLICY IF EXISTS "messages_select_self" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_self" ON public.messages;
DROP POLICY IF EXISTS "messages_update_self" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_self" ON public.messages;
DROP POLICY IF EXISTS "bookings_manage_self" ON public.bookings;
DROP POLICY IF EXISTS "faq_manage_self" ON public.faq;

CREATE POLICY "profiles_select_self"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "profiles_insert_self"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_self"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "threads_select_self"
ON public.threads FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "threads_insert_self"
ON public.threads FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "threads_update_self"
ON public.threads FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "threads_delete_self"
ON public.threads FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "messages_select_self"
ON public.messages FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = public.messages.thread_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "messages_insert_self"
ON public.messages FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = public.messages.thread_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "messages_update_self"
ON public.messages FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = public.messages.thread_id
      AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = public.messages.thread_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "messages_delete_self"
ON public.messages FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = public.messages.thread_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "bookings_manage_self"
ON public.bookings FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "faq_manage_self"
ON public.faq FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON public.threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_external_id ON public.threads(external_thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_last_activity_at ON public.threads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start ON public.bookings(start);
CREATE INDEX IF NOT EXISTS idx_faq_user_id ON public.faq(user_id);
