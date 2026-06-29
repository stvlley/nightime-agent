// Minimal ambient `Deno` declaration so Deno-targeted Edge Function modules
// (e.g. supabase/functions/_shared/llm.ts) typecheck when a vitest test imports
// them into the main tsc program. `supabase/functions` is excluded from this
// tsconfig and checked against the real Deno types by `npm run typecheck:functions`.
declare const Deno: {
  env: { get(key: string): string | undefined };
};
