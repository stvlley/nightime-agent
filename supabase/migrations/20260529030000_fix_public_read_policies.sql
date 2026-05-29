/*
  # Fix public-read RLS on services & availability (Phase 1.5 hotfix)

  The original public-read policies tested
    EXISTS (SELECT 1 FROM public.profiles WHERE id = provider_id AND published)
  But that subquery runs as the querying role (anon), which is subject to the
  OWNER-ONLY RLS on profiles — so for anon it returns zero rows, the EXISTS is
  always false, and no services/availability are ever visible publicly.

  Fix: test against the `public_provider_profiles` VIEW instead. The view runs
  security_invoker = false (as its owner), so it is NOT blocked by profiles RLS
  and already filters to published providers. anon has SELECT on the view.
*/

DROP POLICY IF EXISTS "services_public_read" ON public.services;
CREATE POLICY "services_public_read"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    active
    AND EXISTS (
      SELECT 1 FROM public.public_provider_profiles v
      WHERE v.id = services.provider_id
    )
  );

DROP POLICY IF EXISTS "availability_public_read" ON public.availability;
CREATE POLICY "availability_public_read"
  ON public.availability FOR SELECT
  TO anon, authenticated
  USING (
    active
    AND EXISTS (
      SELECT 1 FROM public.public_provider_profiles v
      WHERE v.id = availability.provider_id
    )
  );
