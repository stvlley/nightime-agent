/*
  Connected calendar + booking sync.

  1. `calendar_connections`: the provider's connected calendar. Today a
     'simulated' provider is created on connect so the flow is testable without
     external OAuth; a real 'google' provider stores OAuth tokens here later.

  2. `calendar_events`: the events the agent has pushed to the connected calendar.
     This represents the external calendar's contents so a test can confirm that
     a confirmed booking actually lands on the connected calendar. Each row links
     back to the booking; `bookings.calendar_event_id` is stamped with the
     external event id on sync.
*/

CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'simulated' CHECK (provider IN ('simulated', 'google')),
  external_calendar_id text,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  access_token text,
  refresh_token text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calendar_connections_manage_self" ON public.calendar_connections;
CREATE POLICY "calendar_connections_manage_self"
  ON public.calendar_connections FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  external_event_id text NOT NULL,
  title text,
  start timestamptz,
  "end" timestamptz,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS calendar_events_user_idx ON public.calendar_events (user_id, start);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calendar_events_select_self" ON public.calendar_events;
CREATE POLICY "calendar_events_select_self"
  ON public.calendar_events FOR SELECT
  USING (user_id = auth.uid());
