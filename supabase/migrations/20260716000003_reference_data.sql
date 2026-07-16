-- ============================================================================
-- currencies, gift_types
-- ============================================================================
-- Both are admin-managed reference data that gifts hang off of. Neither is
-- hardcoded as an enum because the whole point of "unlimited gift categories"
-- (PRD) is that a Super Admin can add one without an app release.
-- ============================================================================

create table public.currencies (
  id         uuid primary key default gen_random_uuid(),
  -- ISO-4217-style 3-letter code. Not a strict ISO validity check (that list
  -- changes over time and isn't this schema's job to police) — just a shape
  -- guard against garbage input.
  code       text not null unique check (code ~ '^[A-Z]{3}$'),
  name       text not null,
  symbol     text,
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.currencies is
  'Admin-managed currency list. Cash gifts reference this; totals are always grouped per-currency, never summed across rows (PRD business rule: never blend currencies).';

create index currencies_active_idx on public.currencies (sort_order) where deleted_at is null and is_active;
create index currencies_deleted_at_idx on public.currencies (deleted_at) where deleted_at is not null;

insert into public.currencies (code, name, symbol, sort_order) values
  ('UZS', 'Uzbekistani Som', 'so''m', 1),
  ('USD', 'US Dollar', '$', 2),
  ('EUR', 'Euro', '€', 3);


create table public.gift_types (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  -- Stable machine key the app can branch on (form logic, icon lookup)
  -- without depending on a translatable display string.
  slug             text not null unique check (slug ~ '^[a-z0-9_]+$'),
  icon             text,
  -- These three flags are what let the gift entry form (and the
  -- validate_gift_fields trigger on public.gifts) be data-driven: a type
  -- declares which fields apply to it instead of the app hardcoding a
  -- switch statement per category. Adding "Car" as a new gift type next
  -- year is an INSERT here, not a code change.
  requires_amount   boolean not null default false,
  requires_currency boolean not null default false,
  requires_weight   boolean not null default false,
  is_system        boolean not null default false,
  sort_order       int not null default 0,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  check (requires_amount or not requires_currency) -- currency only makes sense alongside an amount
);

comment on table public.gift_types is
  'Dynamic, admin-extensible gift categories. is_system flags the seeded defaults for UI purposes only — it does not block editing or deleting them.';
comment on column public.gift_types.slug is
  'Stable machine key (e.g. "cash", "gold"), independent of the translatable "name" column.';

create index gift_types_active_idx on public.gift_types (sort_order) where deleted_at is null;
create index gift_types_deleted_at_idx on public.gift_types (deleted_at) where deleted_at is not null;

insert into public.gift_types (name, slug, icon, requires_amount, requires_currency, requires_weight, is_system, sort_order) values
  ('Cash',           'cash',           'banknote',    true,  true,  false, true, 1),
  ('Gold',           'gold',           'gem',         false, false, true,  true, 2),
  ('Silver',         'silver',         'gem',         false, false, true,  true, 3),
  ('Cow',            'cow',            'beef',        false, false, true,  true, 4),
  ('Sheep',          'sheep',          'beef',        false, false, true,  true, 5),
  ('Goat',           'goat',           'beef',        false, false, true,  true, 6),
  ('Beef',           'beef',           'beef',        false, false, true,  true, 7),
  ('Rice',           'rice',           'wheat',       false, false, true,  true, 8),
  ('Flour',          'flour',          'wheat',       false, false, true,  true, 9),
  ('Sugar',          'sugar',          'wheat',       false, false, true,  true, 10),
  ('Furniture',      'furniture',      'armchair',    false, false, false, true, 11),
  ('Electronics',    'electronics',    'tv',          false, false, false, true, 12),
  ('Home Appliance', 'home_appliance', 'refrigerator',false, false, false, true, 13),
  ('Jewelry',        'jewelry',        'gem',         false, false, false, true, 14),
  ('Other',          'other',          'package',     false, false, false, true, 15);
