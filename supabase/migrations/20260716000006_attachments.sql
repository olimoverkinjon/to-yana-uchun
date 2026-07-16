-- ============================================================================
-- attachments
-- ============================================================================
-- Links a Supabase Storage object to exactly one event or one gift. Modeled
-- as two nullable FK columns + a check constraint rather than a polymorphic
-- (entity_type text, entity_id uuid) pair, so the database itself enforces
-- the parent actually exists — a text+uuid polymorphic pair gives up real
-- referential integrity, which this product's "nothing disappears without
-- trace" promise cannot afford.
-- ============================================================================

create table public.attachments (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid references public.events (id) on delete cascade,
  gift_id        uuid references public.gifts (id) on delete cascade,
  storage_bucket text not null default 'attachments',
  storage_path   text not null unique,
  file_name      text not null,
  mime_type      text,
  file_size      bigint,
  uploaded_by    uuid not null references public.profiles (id) on delete restrict,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,

  check (
    (event_id is not null and gift_id is null) or
    (event_id is null and gift_id is not null)
  )
);

comment on table public.attachments is
  'A file (receipt image, event cover, future gallery photo) attached to exactly one event or one gift. Cascades on hard delete of the parent as a storage-orphan safety net — the app itself only ever soft-deletes parents.';

create index attachments_event_id_idx on public.attachments (event_id) where deleted_at is null;
create index attachments_gift_id_idx on public.attachments (gift_id) where deleted_at is null;
create index attachments_uploaded_by_idx on public.attachments (uploaded_by);
create index attachments_deleted_at_idx on public.attachments (deleted_at) where deleted_at is not null;
