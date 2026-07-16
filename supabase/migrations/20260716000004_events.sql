-- ============================================================================
-- events
-- ============================================================================
-- Each wedding is an Event. event_year is required and independent of
-- event_date (nullable) because this product's founding use case is
-- digitizing decades-old handwritten notebooks that often only recorded a
-- year, never an exact day — the schema must not force a fabricated date.
-- ============================================================================

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  bride_name    text,
  groom_name    text,
  event_date    date,
  event_year    int not null,
  location      text,
  cover_image   text,
  status        text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by    uuid not null references public.profiles (id) on delete restrict,
  updated_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  check (event_year between 1900 and 2100),
  check (event_date is null or extract(year from event_date)::int = event_year)
);

comment on table public.events is
  'A wedding. event_year is always required; event_date is optional to support digitizing legacy records that only ever recorded a year.';
comment on column public.events.status is
  'draft: being set up, not yet visible to Viewers. active: in normal use. archived: completed, hidden from the default list but fully intact and restorable.';

-- Every Viewer-facing list query filters status/deleted_at and sorts by
-- year — this composite index serves the single most common query shape
-- directly ("active, non-deleted events, newest year first").
create index events_status_year_idx
  on public.events (status, event_year desc)
  where deleted_at is null;

create index events_created_by_idx on public.events (created_by);
create index events_deleted_at_idx on public.events (deleted_at) where deleted_at is not null;

-- Full-text search across the fields the PRD's global search explicitly
-- names: wedding name (title), and the two names most likely to be
-- searched (bride/groom). A generated column keeps the index in sync
-- automatically — no trigger to maintain it or forget to update.
alter table public.events
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(bride_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(groom_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored;

comment on column public.events.search_vector is
  '''simple'' config deliberately, not ''english'': names should not be stemmed and this dataset is multilingual (uz/ru/en), where a language-specific stemmer would mangle non-English names more than it helps.';

create index events_search_vector_idx on public.events using gin (search_vector);

-- Trigram indexes back ILIKE ''%partial%'' matches and typo-tolerant lookups
-- on the same three name fields, complementing (not replacing) full-text
-- search: tsvector matches whole words, trigram matches substrings/typos.
create index events_title_trgm_idx on public.events using gin (title extensions.gin_trgm_ops);
create index events_bride_name_trgm_idx on public.events using gin (bride_name extensions.gin_trgm_ops);
create index events_groom_name_trgm_idx on public.events using gin (groom_name extensions.gin_trgm_ops);
