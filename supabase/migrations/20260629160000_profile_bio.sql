-- Provider bio: a one-line description of who the provider is / what they do.
-- Fed into the agent's context so the chat agent knows the business it represents
-- (e.g. "a licensed massage therapist") instead of only the business name.
alter table public.profiles add column if not exists bio text;
