/*
  # Portal + tenancy schema (Phase 1.5)

  Adds the public-facing provider profile surface, relational services &
  availability, and payment-ready booking columns. Everything is keyed by
  provider id (= auth.users.id) so the same schema supports multiple providers
  later; only one provider is seeded now.

  Security model:
  - profiles keeps OWNER-ONLY RLS (it holds private columns: email, fcm_token,
    plan, usage_*). We do NOT add a public row-level read policy, because RLS is
    row-level, not column-level — that would leak private columns of published
    rows.
  - Instead, public read of provider profiles goes through the view
    `public_provider_profiles`, which selects ONLY safe columns WHERE published.
    The view is the public boundary; anon is granted SELECT on the view only,
    never on the base profiles table.
  - services / availability use row-level public-read policies that are safe
    because those tables contain no private columns; public can read only rows
    that are active AND belong to a published provider.
*/

-- ---------------------------------------------------------------------------
-- 1. Provider public fields on profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS location_label text,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_gate_required boolean NOT NULL DEFAULT true;

-- Slug must be unique across providers (the public URL key: /p/<slug>),
-- lowercase + url-safe. Enforced when present; NULL allowed until published.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles (slug)
  WHERE slug IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_slug_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_slug_format
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- A profile may only be published once it has the minimum public fields.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_publish_requirements;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_publish_requirements
  CHECK (published = false OR (slug IS NOT NULL AND display_name IS NOT NULL));

-- ---------------------------------------------------------------------------
-- 2. Services (relational)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services (provider_id);

-- ---------------------------------------------------------------------------
-- 3. Availability (relational, weekly recurring)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_provider_id ON public.availability (provider_id);

-- ---------------------------------------------------------------------------
-- 4. Payment-ready booking columns (nullable; no checkout built yet)
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_contact text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
    CHECK (source IS NULL OR source IN ('manual', 'ai', 'portal', 'phone')),
  ADD COLUMN IF NOT EXISTS amount_cents integer CHECK (amount_cents IS NULL OR amount_cents >= 0),
  ADD COLUMN IF NOT EXISTS deposit_cents integer CHECK (deposit_cents IS NULL OR deposit_cents >= 0),
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'none'
    CHECK (payment_status IS NULL OR payment_status IN ('none', 'pending', 'deposit_paid', 'paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_ref text;

-- ---------------------------------------------------------------------------
-- 5. RLS — services & availability
-- ---------------------------------------------------------------------------
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

-- Owner full control
DROP POLICY IF EXISTS "services_manage_self" ON public.services;
CREATE POLICY "services_manage_self"
  ON public.services FOR ALL
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "availability_manage_self" ON public.availability;
CREATE POLICY "availability_manage_self"
  ON public.availability FOR ALL
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Public (anon + authenticated) read: only ACTIVE rows of a PUBLISHED provider.
-- Safe because these tables have no private columns.
DROP POLICY IF EXISTS "services_public_read" ON public.services;
CREATE POLICY "services_public_read"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    active
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = services.provider_id AND p.published
    )
  );

DROP POLICY IF EXISTS "availability_public_read" ON public.availability;
CREATE POLICY "availability_public_read"
  ON public.availability FOR SELECT
  TO anon, authenticated
  USING (
    active
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = availability.provider_id AND p.published
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Public provider profile view (column-subset boundary)
-- ---------------------------------------------------------------------------
-- Exposes ONLY safe columns of PUBLISHED providers. Runs as the view owner
-- (security_invoker = false) so it bypasses the owner-only RLS on profiles,
-- but reveals no private columns because they are simply not selected.
DROP VIEW IF EXISTS public.public_provider_profiles;
CREATE VIEW public.public_provider_profiles
WITH (security_invoker = false) AS
  SELECT
    id,
    slug,
    display_name,
    headline,
    bio,
    avatar_url,
    location_label,
    timezone,
    age_gate_required
  FROM public.profiles
  WHERE published;

-- Base profiles table is NOT granted to anon; only this view is.
GRANT SELECT ON public.public_provider_profiles TO anon, authenticated;
