-- ============================================================================
-- Gift visibility derives from event visibility
-- ============================================================================
-- Phase 2 shipped gifts.deleted_at as the only visibility gate on a gift.
-- That leaves a real gap once events can actually be soft-deleted (Phase 3):
-- a gift whose parent event was deleted stayed independently visible, so a
-- Viewer could still read it directly and it still counted toward dashboard
-- totals. "Delete the event" must mean its gifts go with it.
--
-- Two ways to close that gap:
--   (a) cascade the soft delete onto every child gift, or
--   (b) derive gift visibility from the parent event.
--
-- (b) is chosen here. Cascading would require remembering *why* each gift
-- was deleted, so that restoring an event doesn't also resurrect a gift that
-- had been individually deleted beforehand — bookkeeping that is easy to get
-- wrong and impossible to reconstruct later. Deriving is stateless: restore
-- the event and exactly the gifts that were visible before become visible
-- again, with no extra column and nothing to keep in sync.
-- ============================================================================

drop policy "viewers and above read active gifts" on public.gifts;

create policy "viewers and above read active gifts" on public.gifts
  for select
  using (
    deleted_at is null
    and public.is_viewer_or_above()
    and exists (
      select 1 from public.events e
      where e.id = gifts.event_id and e.deleted_at is null
    )
  );

comment on policy "viewers and above read active gifts" on public.gifts is
  'A gift is visible only while its parent event is. The events lookup is by primary key, so this costs an index hit per row, not a scan.';

-- Writes are gated the same way: a Super Admin must not be able to add or
-- edit gifts on an event that has been deleted — the event is meant to be
-- inert until restored.
drop policy "super admins insert gifts" on public.gifts;

create policy "super admins insert gifts" on public.gifts
  for insert
  with check (
    public.is_super_admin()
    and created_by = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = gifts.event_id and e.deleted_at is null
    )
  );

drop policy "super admins update gifts" on public.gifts;

create policy "super admins update gifts" on public.gifts
  for update
  using (public.is_super_admin())
  with check (
    public.is_super_admin()
    and updated_by = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = gifts.event_id and e.deleted_at is null
    )
  );


-- ============================================================================
-- Aggregate views must filter explicitly, not lean on RLS
-- ============================================================================
-- These views are security_invoker, so for a Viewer the policy above would
-- already exclude gifts of deleted events. A Super Admin, however, can read
-- every gift including deleted ones — so without an explicit WHERE, the same
-- view would report different totals depending on who asked. An aggregate
-- has to mean one thing. Every view below filters on its own.
-- ============================================================================

drop view public.dashboard_stats;
drop view public.event_cash_totals;
drop view public.event_gift_type_totals;

create view public.event_cash_totals
with (security_invoker = true)
as
select
  g.event_id,
  c.id           as currency_id,
  c.code         as currency_code,
  c.symbol       as currency_symbol,
  sum(g.amount)  as total_amount,
  count(*)       as gift_count
from public.gifts g
join public.currencies c on c.id = g.currency_id
join public.events e on e.id = g.event_id
where g.deleted_at is null
  and e.deleted_at is null
  and g.amount is not null
group by g.event_id, c.id, c.code, c.symbol;

comment on view public.event_cash_totals is
  'Cash gift totals per event, grouped by currency. Never summed across currencies.';

create view public.event_gift_type_totals
with (security_invoker = true)
as
select
  g.event_id,
  gt.id          as gift_type_id,
  gt.name        as gift_type_name,
  gt.slug        as gift_type_slug,
  count(*)       as gift_count,
  sum(g.weight)  as total_weight
from public.gifts g
join public.gift_types gt on gt.id = g.gift_type_id
join public.events e on e.id = g.event_id
where g.deleted_at is null
  and e.deleted_at is null
group by g.event_id, gt.id, gt.name, gt.slug;

comment on view public.event_gift_type_totals is
  'Gift counts and total weight per event, grouped by gift type.';

create view public.dashboard_stats
with (security_invoker = true)
as
select
  (select count(*) from public.events where deleted_at is null) as total_events,
  (
    select count(*)
    from public.gifts g
    join public.events e on e.id = g.event_id
    where g.deleted_at is null and e.deleted_at is null
  ) as total_gifts,
  -- Rough proxy until a normalized Guest/Contact entity exists (a planned
  -- follow-up, not built in this phase): counts distinct free-text giver
  -- names, so "Aziz" and "Aziz Karimov" count as two guests today.
  (
    select count(distinct g.giver_name)
    from public.gifts g
    join public.events e on e.id = g.event_id
    where g.deleted_at is null and e.deleted_at is null
  ) as total_guests,
  (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'currency_code', currency_code,
          'currency_symbol', currency_symbol,
          'total_amount', total_amount
        )
        order by currency_code
      ),
      '[]'::jsonb
    )
    from (
      select currency_code, currency_symbol, sum(total_amount) as total_amount
      from public.event_cash_totals
      group by currency_code, currency_symbol
    ) totals
  ) as cash_totals;

comment on view public.dashboard_stats is
  'Single-row global snapshot: event/gift/guest counts plus per-currency cash totals.';

grant select on public.event_cash_totals to authenticated;
grant select on public.event_gift_type_totals to authenticated;
grant select on public.dashboard_stats to authenticated;


-- ============================================================================
-- event_summaries — the event list's read model
-- ============================================================================
-- The list needs a gift count per event. Asking PostgREST to embed
-- `gifts(count)` would count whatever the *caller* is allowed to see, which
-- means a Super Admin (who can read soft-deleted gifts) would see a larger
-- count than a Viewer looking at the same wedding. The count has to be one
-- number, so it is defined here rather than at the call site.
-- ============================================================================

create view public.event_summaries
with (security_invoker = true)
as
select
  e.id,
  e.title,
  e.description,
  e.bride_name,
  e.groom_name,
  e.event_date,
  e.event_year,
  e.location,
  e.cover_image,
  e.status,
  e.created_by,
  e.updated_by,
  e.created_at,
  e.updated_at,
  e.deleted_at,
  coalesce(gc.gift_count, 0) as gift_count
from public.events e
left join (
  select event_id, count(*) as gift_count
  from public.gifts
  where deleted_at is null
  group by event_id
) gc on gc.event_id = e.id;

comment on view public.event_summaries is
  'events + a live count of its non-deleted gifts. Read model for the event list; RLS on events still applies via security_invoker.';

grant select on public.event_summaries to authenticated;
