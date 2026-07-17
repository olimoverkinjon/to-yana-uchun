-- ============================================================================
-- Composable filter helpers
-- ============================================================================
-- Every analytics function in the next migration answers a question about the
-- same filtered slice of the ledger: a year, an event, a gift type, a
-- currency, a date range. Writing that WHERE clause into each of the dozen
-- aggregate functions would mean twelve chances for one of them to filter
-- differently — and a dashboard whose cards and charts disagree is worse than
-- no dashboard.
--
-- So the predicate is written once, here, and everything else selects FROM
-- these. Both are plain SQL (not plpgsql) and STABLE, so Postgres can inline
-- them into the calling query and still use the indexes on gifts/events —
-- a plpgsql wrapper would be an optimizer barrier.
--
-- SECURITY INVOKER (the default), deliberately: these read gifts and events
-- as the caller, so RLS narrows them per user exactly as it does everywhere
-- else. A Viewer's dashboard and a Super Admin's are the same query; the
-- database decides what each can see.
--
-- Both join to events and require the parent event to be alive, matching the
-- rule established in the gift-visibility migration: a deleted event's gifts
-- do not exist as far as the product is concerned.
-- ============================================================================

create or replace function public.filtered_gifts(
  p_year         int  default null,
  p_event_id     uuid default null,
  p_gift_type_id uuid default null,
  p_currency_id  uuid default null,
  p_from         date default null,
  p_to           date default null
)
returns setof public.gifts
language sql
stable
as $$
  select g.*
  from public.gifts g
  join public.events e on e.id = g.event_id
  where g.deleted_at is null
    and e.deleted_at is null
    -- p_year filters on the *wedding's* year, not the gift's date: a
    -- dashboard scoped to "2024" means the weddings of 2024, including a gift
    -- recorded late. Gift dates are filtered by p_from/p_to instead.
    and (p_year is null or e.event_year = p_year)
    and (p_event_id is null or g.event_id = p_event_id)
    and (p_gift_type_id is null or g.gift_type_id = p_gift_type_id)
    and (p_currency_id is null or g.currency_id = p_currency_id)
    and (p_from is null or g.gift_date >= p_from)
    and (p_to is null or g.gift_date <= p_to);
$$;

comment on function public.filtered_gifts is
  'The one definition of "the gifts the dashboard is currently looking at". Every analytics function builds on this so no two can disagree about what is in scope.';


create or replace function public.filtered_events(
  p_year     int  default null,
  p_event_id uuid default null,
  p_from     date default null,
  p_to       date default null
)
returns setof public.events
language sql
stable
as $$
  select e.*
  from public.events e
  where e.deleted_at is null
    and (p_year is null or e.event_year = p_year)
    and (p_event_id is null or e.id = p_event_id)
    -- An event with no exact date still belongs to its year, so a date-range
    -- filter must not silently drop the historical records this product
    -- exists to preserve.
    and (p_from is null or e.event_date is null or e.event_date >= p_from)
    and (p_to is null or e.event_date is null or e.event_date <= p_to);
$$;

comment on function public.filtered_events is
  'Companion to filtered_gifts. Year-only events survive a date-range filter — see the inline note.';

grant execute on function public.filtered_gifts(int, uuid, uuid, uuid, date, date) to authenticated;
grant execute on function public.filtered_events(int, uuid, date, date) to authenticated;
