-- ============================================================================
-- Supabase platform stubs — TEST HARNESS ONLY, never applied to a real project
-- ============================================================================
-- A stock Postgres has none of the pieces Supabase's managed platform
-- provides and that our migrations build on: the `auth` schema and
-- auth.uid(), the anon/authenticated/service_role roles, the `storage`
-- schema, and the `supabase_realtime` publication.
--
-- This file recreates just enough of that surface for the migrations to
-- apply and for RLS to be exercised for real. It lives under scripts/, not
-- supabase/migrations/, precisely so it can never be pushed to a real
-- project where these objects already exist.
--
-- auth.uid() below is Supabase's actual implementation, not an
-- approximation — reading the `sub` claim out of the request.jwt.claims
-- setting. That is what makes an RLS test here meaningful: policies resolve
-- the current user through the same path they will in production.
-- ============================================================================

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

-- Supabase's real definition.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- storage — enough of the real shape for the bucket/policy migration to apply
-- ----------------------------------------------------------------------------

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  owner              uuid,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  public             boolean default false,
  avif_autodetection boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id               uuid primary key default gen_random_uuid(),
  bucket_id        text references storage.buckets (id),
  name             text,
  owner            uuid,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata         jsonb
);

alter table storage.objects enable row level security;

grant select on storage.buckets to anon, authenticated, service_role;
grant all on storage.objects to authenticated, service_role;


-- ----------------------------------------------------------------------------
-- realtime
-- ----------------------------------------------------------------------------
-- Every Supabase project ships with this publication already created; our
-- realtime migration only ever ADDs tables to it.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
