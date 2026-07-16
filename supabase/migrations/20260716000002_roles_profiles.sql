-- ============================================================================
-- roles, profiles, user_roles
-- ============================================================================
-- Design notes:
--
-- * "roles" is a table, not a Postgres enum or a hardcoded check on profiles,
--   so a future role (e.g. "editor") is an INSERT, not a schema migration +
--   app redeploy. Only two rows are seeded now per the product's explicit
--   two-role model.
--
-- * "profiles" is the Telegram identity record. There is no Supabase Auth
--   user behind it (no email/password/OAuth) — the app verifies Telegram's
--   signed initData itself and calls upsert_telegram_profile() (see the
--   functions migration) to create/update this row. profiles.id is a
--   standalone uuid that becomes the `sub` claim of a Supabase-compatible
--   JWT the app mints for that session, which is what lets RLS's auth.uid()
--   resolve to the right row without ever touching auth.users.
--
-- * "user_roles" is a many-to-many grant table, not a single role_id column
--   on profiles, so a role can be revoked (soft-deleted here as revocation)
--   without losing who granted it or when — an explicit accountability trail
--   the PRD's audit requirements call for at the permission level, not just
--   the data level.
--
-- * A brand-new profile gets NO row in user_roles. There is no "default
--   viewer" grant. This is deliberate: gift records pair real names with
--   cash/gold amounts, so visibility must be opt-in per user, granted by a
--   Super Admin — never an implicit default for anyone who opens the bot.
--   See RLS policies migration for how this plays out (is_viewer_or_above()
--   returns false until a grant exists).
-- ============================================================================

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (name in ('viewer', 'super_admin')),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.roles is
  'Fixed set of permission levels. A table (not an enum) so a future role is an INSERT, not a migration.';

insert into public.roles (name, description) values
  ('viewer', 'Read-only access to non-deleted records: events, gifts, currencies, gift types, settings.'),
  ('super_admin', 'Full create/update/soft-delete access to all content, plus role grants, user management, and settings.');

create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  telegram_id   bigint not null unique,
  username      text,
  first_name    text not null,
  last_name     text,
  photo_url     text,
  language_code text,
  is_premium    boolean not null default false,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

comment on table public.profiles is
  'Telegram identity record. No Supabase Auth user backs this — see upsert_telegram_profile().';
comment on column public.profiles.telegram_id is
  'bigint, not int: Telegram user ids can exceed the int4 range.';
comment on column public.profiles.deleted_at is
  'Soft-deactivation of an account. Distinct from role revocation (see user_roles.deleted_at).';

-- Case-insensitive lookup for @username mentions/search, without a functional
-- index footgun: this is a plain btree on the raw column for the unique/FK
-- lookup path (telegram_id is the real identity key); username itself isn't
-- unique in Telegram and is only ever used for display/search.
create index profiles_username_idx on public.profiles (username) where deleted_at is null;
create index profiles_deleted_at_idx on public.profiles (deleted_at) where deleted_at is not null;

create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role_id     uuid not null references public.roles (id) on delete restrict,
  granted_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Revocation is this table's "soft delete": null = the grant is active.
  deleted_at  timestamptz
);

comment on table public.user_roles is
  'Role grants. deleted_at = revoked_at: a non-null value means the grant no longer applies.';
comment on column public.user_roles.granted_by is
  'Accountability trail: who granted this role. Not enforced not-null so the very first bootstrap grant (run manually, before any Super Admin exists) can leave it null.';

-- A user cannot hold the same *active* role twice — but can hold it again
-- after a prior grant of it was revoked, hence the partial unique index
-- rather than a plain UNIQUE(user_id, role_id) constraint.
create unique index user_roles_active_unique_idx
  on public.user_roles (user_id, role_id)
  where deleted_at is null;

-- Every permission check in every RLS policy runs "WHERE user_id = auth.uid()
-- AND deleted_at IS NULL, joined to roles" (see has_role() in the functions
-- migration) — this is the single hottest lookup in the entire schema, on
-- every request, and it only ever filters by user_id at this table's level
-- (the role name filter happens after the join to the tiny roles table).
create index user_roles_active_by_user_idx
  on public.user_roles (user_id)
  where deleted_at is null;

create index user_roles_granted_by_idx on public.user_roles (granted_by);
