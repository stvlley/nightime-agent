/*
  # Add production auth profile tables

  Creates the profile and booking tables expected by the app's Supabase client.
  The app can boot without these tables in demo mode, but persistent auth/data
  requires this migration in the target Supabase project.
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

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.threads(id) ON DELETE SET NULL,
  calendar_event_id text,
  start timestamptz,
  "end" timestamptz,
  status text DEFAULT 'tentative' CHECK (status IN ('tentative', 'confirmed', 'cancelled', 'completed', 'no_show')),
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
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
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

CREATE POLICY "bookings_manage_self"
ON public.bookings FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "faq_manage_self"
ON public.faq FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start ON public.bookings(start);
CREATE INDEX IF NOT EXISTS idx_faq_user_id ON public.faq(user_id);
