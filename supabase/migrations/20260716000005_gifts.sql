-- ============================================================================
-- gifts
-- ============================================================================
-- The permanent ledger line. event_id/gift_type_id/currency_id use
-- ON DELETE RESTRICT everywhere: nothing upstream can be hard-deleted while
-- gift history still references it, by design — this table is the entire
-- reason the product exists, so referential integrity here is non-negotiable.
-- ============================================================================

create table public.gifts (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete restrict,
  giver_name   text not null,
  gift_type_id uuid not null references public.gift_types (id) on delete restrict,
  amount       numeric(18, 2),
  currency_id  uuid references public.currencies (id) on delete restrict,
  weight       numeric(12, 3),
  unit         text,
  description  text,
  gift_date    date not null default current_date,
  notes        text,
  created_by   uuid not null references public.profiles (id) on delete restrict,
  updated_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  -- Structural sanity checks the database can verify on its own. Whether a
  -- *specific* gift_type actually requires amount/currency/weight is a
  -- cross-table rule enforced by the validate_gift_fields trigger instead
  -- (a plain CHECK constraint cannot reference another table).
  check (amount is null or amount >= 0),
  check (weight is null or weight >= 0),
  check ((amount is null) = (currency_id is null)) -- an amount without a currency is meaningless, and vice versa
);

comment on table public.gifts is
  'One gift record. Required fields depend on gift_type (amount+currency for cash-like types, weight+unit for measured types) — enforced by the validate_gift_fields trigger, not by nullable-everything laxity.';
comment on column public.gifts.amount is
  'numeric(18,2), never float: this is money. Precision matters for a ledger meant to be trusted for a decade.';
comment on column public.gifts.weight is
  'numeric(12,3) in whatever unit the `unit` column names (kg, g, head, piece, ...) — deliberately not constrained to one measurement system.';

-- The single most common query in the whole app: "gifts for this event,
-- not deleted". Every other filter (type, currency, date) narrows this set.
create index gifts_event_id_idx on public.gifts (event_id) where deleted_at is null;

create index gifts_gift_type_id_idx on public.gifts (gift_type_id) where deleted_at is null;
create index gifts_currency_id_idx on public.gifts (currency_id) where deleted_at is null;
create index gifts_created_by_idx on public.gifts (created_by);
create index gifts_gift_date_idx on public.gifts (gift_date desc) where deleted_at is null;
create index gifts_deleted_at_idx on public.gifts (deleted_at) where deleted_at is not null;

-- Fuzzy/partial name search — the single most common real-world query this
-- product serves ("what did <person> give us, across every wedding?").
create index gifts_giver_name_trgm_idx on public.gifts using gin (giver_name extensions.gin_trgm_ops);

-- Full-text search across giver name + free-text description, mirroring the
-- events.search_vector approach, for the app's global search feature.
alter table public.gifts
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(giver_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(notes, '')), 'C')
  ) stored;

create index gifts_search_vector_idx on public.gifts using gin (search_vector);
