-- ============================================================================
-- settings
-- ============================================================================
-- Key/value app configuration, editable by a Super Admin without a
-- deployment. No deleted_at here, unlike almost every other table: a
-- "deleted" setting isn't a meaningful state to preserve for restore — an
-- admin either changes a value or the key stops being read by the app.
-- ============================================================================

create table public.settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null,
  description text,
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.settings is
  'Key/value app configuration, editable by a Super Admin at runtime. No deleted_at: settings are upserted/reset, not soft-deleted.';

insert into public.settings (key, value, description) values
  ('app_name', '"Wedding Registry"', 'Display name shown in the UI'),
  ('default_language', '"uz"', 'Fallback locale for a first-time visitor with no detectable language preference'),
  ('supported_languages', '["uz", "ru", "en"]', 'Locales the UI is translated into');
