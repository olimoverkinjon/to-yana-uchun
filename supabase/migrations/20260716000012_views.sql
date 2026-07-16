-- ============================================================================
-- Views
-- ============================================================================
-- Every view here is declared `with (security_invoker = true)`. This is not
-- optional decoration: Postgres views default to running with the *owner's*
-- privileges for the purpose of Row Level Security, which — for a view
-- created by the migration-owning role — means RLS on the underlying
-- tables would silently be bypassed for every caller. security_invoker
-- makes each view re-check RLS as the actual querying user, so a Viewer
-- querying dashboard_stats only ever sees aggregates over rows they were
-- already allowed to see, and someone with no role at all sees zeros, not
-- an error and not someone else's data.
-- ============================================================================

-- Per event, per currency cash totals. Never a single blended number across
-- currencies — this view is the concrete enforcement of that business rule.
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
where g.deleted_at is null
  and g.amount is not null
group by g.event_id, c.id, c.code, c.symbol;

comment on view public.event_cash_totals is
  'Cash gift totals per event, grouped by currency. Never summed across currencies.';

-- Per event, per gift-type counts and weights (livestock, gold, produce, ...).
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
where g.deleted_at is null
group by g.event_id, gt.id, gt.name, gt.slug;

comment on view public.event_gift_type_totals is
  'Gift counts and total weight per event, grouped by gift type.';

-- The dashboard's headline numbers, computed fresh on every read. Not
-- materialized: at this product's actual scale (one family or community's
-- gift history, not a high-traffic multi-tenant platform — see the explicit
-- no-multi-tenancy decision for this phase), a handful of aggregate queries
-- over a few thousand rows costs single-digit milliseconds. A materialized
-- view would add refresh-scheduling complexity this doesn't need yet.
create view public.dashboard_stats
with (security_invoker = true)
as
select
  (select count(*) from public.events where deleted_at is null)         as total_events,
  (select count(*) from public.gifts where deleted_at is null)          as total_gifts,
  -- Rough proxy until a normalized Guest/Contact entity exists (a planned
  -- follow-up, not built in this phase): counts distinct free-text giver
  -- names, so "Aziz" and "Aziz Karimov" count as two guests today.
  (select count(distinct giver_name) from public.gifts where deleted_at is null) as total_guests,
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
  'Single-row global snapshot for the Super Admin dashboard: event/gift/guest counts plus per-currency cash totals.';

-- A friendly, pre-joined feed of "who did what, when" for the audit/activity
-- UI, so the app isn't hand-joining audit_logs to profiles in every query.
create view public.recent_activity
with (security_invoker = true)
as
select
  al.id,
  al.table_name,
  al.record_id,
  al.action,
  al.reason,
  al.created_at,
  al.changed_by,
  p.first_name as changed_by_first_name,
  p.last_name  as changed_by_last_name,
  p.username   as changed_by_username
from public.audit_logs al
left join public.profiles p on p.id = al.changed_by
order by al.created_at desc;

comment on view public.recent_activity is
  'audit_logs pre-joined to profiles for display. Same RLS as audit_logs applies (super_admin only) via security_invoker.';
