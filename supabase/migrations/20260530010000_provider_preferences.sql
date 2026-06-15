/*
  # Provider setup preferences

  Stores provider-owned business operations preferences edited from the app.
  Public profile, services, and availability stay in their existing tables.
*/

CREATE TABLE IF NOT EXISTS public.provider_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_category text,
  agent_tone text,
  approval_mode text NOT NULL DEFAULT 'manual'
    CHECK (approval_mode IN ('manual', 'auto_eligible')),
  moderation_level text NOT NULL DEFAULT 'medium'
    CHECK (moderation_level IN ('low', 'medium', 'strict')),
  follow_up_enabled boolean NOT NULL DEFAULT true,
  notifications_enabled boolean NOT NULL DEFAULT false,
  notification_permission text NOT NULL DEFAULT 'skipped'
    CHECK (notification_permission IN ('granted', 'denied', 'unsupported', 'skipped')),
  setup_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_preferences_manage_self" ON public.provider_preferences;
CREATE POLICY "provider_preferences_manage_self"
  ON public.provider_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_provider_preferences_updated_at ON public.provider_preferences;
CREATE TRIGGER set_provider_preferences_updated_at
  BEFORE UPDATE ON public.provider_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
