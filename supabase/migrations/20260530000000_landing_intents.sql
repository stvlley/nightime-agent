-- Landing-page intent capture (provider + client early access leads).
-- Anonymous inserts allowed; reads are admin-only (no anon/authenticated select policy).

create table if not exists public.landing_intents (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('provider', 'client')),
  email text not null,
  name text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists landing_intents_created_at_idx
  on public.landing_intents (created_at desc);

alter table public.landing_intents enable row level security;

drop policy if exists "landing_intents anon insert" on public.landing_intents;
create policy "landing_intents anon insert"
  on public.landing_intents
  for insert
  to anon
  with check (true);

drop policy if exists "landing_intents authenticated insert" on public.landing_intents;
create policy "landing_intents authenticated insert"
  on public.landing_intents
  for insert
  to authenticated
  with check (true);

-- No SELECT policy: reads require the service role.
