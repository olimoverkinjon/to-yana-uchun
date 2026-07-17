-- ============================================================================
-- gift_types.category — what kind of thing a gift type is
-- ============================================================================
-- The dashboard has to answer "how much gold" and "how many livestock" across
-- a set of gift types the Super Admin can extend at will. Without this column
-- the only way to group them is a hardcoded list of slugs in the query — which
-- would mean a category added next year silently vanishes from the dashboard
-- until someone edits SQL. That defeats the reason gift_types is a table.
--
-- Deliberately coarse. These five are the groupings the dashboard actually
-- reports on; anything finer is what gift_type_id itself is for.
--
--   cash      — money, reported per currency and never summed across them
--   precious  — gold, silver, jewellery; reported by weight
--   livestock — animals; reported by head count
--   produce   — food staples (beef, rice, flour, sugar)
--   goods     — furniture, electronics, appliances, anything else
--
-- produce and goods are separate here even though today's dashboard rolls them
-- into one "other" figure: they are genuinely different questions ("how much
-- food came in" vs "how many appliances"), and splitting later would mean
-- re-classifying rows retroactively, which for a permanent ledger is exactly
-- the migration we do not want to run.
-- ============================================================================

alter table public.gift_types
  add column category text not null default 'goods'
    check (category in ('cash', 'precious', 'livestock', 'produce', 'goods'));

comment on column public.gift_types.category is
  'Coarse grouping the dashboard aggregates by. A new gift type picks one, so it lands in the right total with no code change.';

update public.gift_types set category = 'cash'      where slug in ('cash');
update public.gift_types set category = 'precious'  where slug in ('gold', 'silver', 'jewelry');
update public.gift_types set category = 'livestock' where slug in ('cow', 'sheep', 'goat');
update public.gift_types set category = 'produce'   where slug in ('beef', 'rice', 'flour', 'sugar');
update public.gift_types set category = 'goods'     where slug in ('furniture', 'electronics', 'home_appliance', 'other');

-- Every dashboard aggregate groups or filters by this.
create index gift_types_category_idx on public.gift_types (category) where deleted_at is null;
