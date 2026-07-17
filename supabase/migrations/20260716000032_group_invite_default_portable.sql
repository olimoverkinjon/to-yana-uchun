-- Keep invite-code generation portable across Supabase cloud and the local
-- disposable Postgres harness used for type generation.
alter table public.groups
  alter column invite_code set default lower(replace(gen_random_uuid()::text, '-', ''));
