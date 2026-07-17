-- ============================================================================
-- Dashboard totals, trends, and per-event statistics
-- ============================================================================
-- Everything here computes from live rows at read time. There is no
-- denormalized counter to drift out of sync, and no refresh job to forget to
-- run: at this product's scale (one family's or community's gift history —
-- thousands of rows, not millions), aggregating over the indexed set costs
-- single-digit milliseconds, and a stale number in a ledger people trust is a
-- far worse failure than a few milliseconds.
--
-- All of them are SECURITY INVOKER and read through filtered_gifts /
-- filtered_events, so RLS scopes them to the caller automatically.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- percent_change — one definition of a trend
-- ----------------------------------------------------------------------------
-- Growth from nothing is the awkward case: 0 → 5 is not "500% up", it is
-- "up from nothing", and any number invented there is a lie with a decimal
-- point. Returning null lets the UI say exactly that instead.
-- ----------------------------------------------------------------------------

create or replace function public.percent_change(p_previous numeric, p_current numeric)
returns numeric
language sql
immutable
as $$
  select case
    when p_previous is null or p_current is null then null
    when p_previous = 0 and p_current = 0 then 0
    when p_previous = 0 then null
    else round(((p_current - p_previous) / abs(p_previous)) * 100, 1)
  end;
$$;

comment on function public.percent_change is
  'Percentage change, or null when there is no honest answer (growth from a zero baseline).';


-- ----------------------------------------------------------------------------
-- Trend window
-- ----------------------------------------------------------------------------
-- "Trend" compares the trailing 30 days against the 30 before it, measured on
-- created_at — when the record was *entered*, not gift_date, when the gift was
-- given. That is deliberate: gift_date is frequently backdated (this product
-- exists to digitize decades-old notebooks), so a gift_date trend would show a
-- 2019 spike the day someone transcribes an old notebook. created_at answers
-- "how much has been recorded lately", which is the question a trend indicator
-- is actually asked.
-- ----------------------------------------------------------------------------

create or replace function public.dashboard_totals(
  p_year         int  default null,
  p_event_id     uuid default null,
  p_gift_type_id uuid default null,
  p_currency_id  uuid default null,
  p_from         date default null,
  p_to           date default null
)
returns table (
  total_events             bigint,
  total_gifts              bigint,
  total_contributors       bigint,
  cash_totals              jsonb,
  gold_weight              numeric,
  livestock_count          bigint,
  other_count              bigint,
  last_updated             timestamptz,
  events_trend_pct         numeric,
  gifts_trend_pct          numeric,
  contributors_trend_pct   numeric,
  cash_trend_pct           numeric,
  gold_trend_pct           numeric,
  livestock_trend_pct      numeric,
  other_trend_pct          numeric
)
language sql
stable
as $$
  with g as (
    select gf.*, gt.category
    from public.filtered_gifts(p_year, p_event_id, p_gift_type_id, p_currency_id, p_from, p_to) gf
    join public.gift_types gt on gt.id = gf.gift_type_id
  ),
  e as (
    select * from public.filtered_events(p_year, p_event_id, p_from, p_to)
  ),
  windows as (
    select
      (now() - interval '30 days') as current_start,
      (now() - interval '60 days') as previous_start
  ),
  -- Recorded in the last 30 days vs the 30 before that.
  current_window as (
    select
      count(*) filter (where category = 'livestock')                as livestock,
      count(*) filter (where category in ('produce', 'goods'))      as other,
      count(*)                                                      as gifts,
      count(distinct giver_name)                                    as contributors,
      coalesce(sum(amount) filter (where category = 'cash'), 0)     as cash,
      coalesce(sum(weight) filter (where category = 'precious'), 0) as gold
    from g, windows
    where g.created_at >= windows.current_start
  ),
  previous_window as (
    select
      count(*) filter (where category = 'livestock')                as livestock,
      count(*) filter (where category in ('produce', 'goods'))      as other,
      count(*)                                                      as gifts,
      count(distinct giver_name)                                    as contributors,
      coalesce(sum(amount) filter (where category = 'cash'), 0)     as cash,
      coalesce(sum(weight) filter (where category = 'precious'), 0) as gold
    from g, windows
    where g.created_at >= windows.previous_start
      and g.created_at < windows.current_start
  ),
  events_current as (
    select count(*) as n from e, windows where e.created_at >= windows.current_start
  ),
  events_previous as (
    select count(*) as n from e, windows
    where e.created_at >= windows.previous_start and e.created_at < windows.current_start
  )
  select
    (select count(*) from e),
    (select count(*) from g),
    -- A "contributor" is a distinct giver_name. Free text, so "Aziz" and
    -- "Aziz Karimov" count as two people — a known limitation until the
    -- Contact entity exists. Surfacing a slightly-high number is honest;
    -- guessing at which names are the same person would not be.
    (select count(distinct giver_name) from g),
    -- Per currency, never blended. Summing UZS and USD is not arithmetic.
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('currency_code', code, 'currency_symbol', symbol, 'total_amount', total)
          order by total desc
        ),
        '[]'::jsonb
      )
      from (
        select c.code, c.symbol, sum(g.amount) as total
        from g
        join public.currencies c on c.id = g.currency_id
        where g.amount is not null
        group by c.code, c.symbol
      ) per_currency
    ),
    (select coalesce(sum(weight), 0) from g where category = 'precious'),
    (select count(*) from g where category = 'livestock'),
    (select count(*) from g where category in ('produce', 'goods')),
    -- "Last updated" is the freshest change to anything in scope, which is
    -- what the card is claiming — not now(), which would always look fresh.
    greatest((select max(updated_at) from g), (select max(updated_at) from e)),
    public.percent_change((select n from events_previous), (select n from events_current)),
    public.percent_change((select gifts from previous_window), (select gifts from current_window)),
    public.percent_change((select contributors from previous_window), (select contributors from current_window)),
    public.percent_change((select cash from previous_window), (select cash from current_window)),
    public.percent_change((select gold from previous_window), (select gold from current_window)),
    public.percent_change((select livestock from previous_window), (select livestock from current_window)),
    public.percent_change((select other from previous_window), (select other from current_window));
$$;

comment on function public.dashboard_totals is
  'Every headline figure in one round trip. Trends compare the trailing 30 days to the 30 before, on created_at — see the note above on why not gift_date.';


-- ----------------------------------------------------------------------------
-- Per-event statistics
-- ----------------------------------------------------------------------------

create or replace function public.event_statistics(p_event_id uuid)
returns table (
  total_gifts        bigint,
  total_contributors bigint,
  cash_totals        jsonb,
  gold_weight        numeric,
  gold_count         bigint,
  livestock_count    bigint,
  products_count     bigint,
  most_common_type   text,
  most_common_count  bigint,
  newest_gift_date   date,
  oldest_gift_date   date
)
language sql
stable
as $$
  with g as (
    select gf.*, gt.category, gt.name as type_name
    from public.filtered_gifts(null, p_event_id, null, null, null, null) gf
    join public.gift_types gt on gt.id = gf.gift_type_id
  )
  select
    (select count(*) from g),
    (select count(distinct giver_name) from g),
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('currency_code', code, 'currency_symbol', symbol, 'total_amount', total)
          order by total desc
        ),
        '[]'::jsonb
      )
      from (
        select c.code, c.symbol, sum(g.amount) as total
        from g
        join public.currencies c on c.id = g.currency_id
        where g.amount is not null
        group by c.code, c.symbol
      ) per_currency
    ),
    (select coalesce(sum(weight), 0) from g where category = 'precious'),
    (select count(*) from g where category = 'precious'),
    (select count(*) from g where category = 'livestock'),
    (select count(*) from g where category in ('produce', 'goods')),
    (select type_name from g group by type_name order by count(*) desc, type_name limit 1),
    (select count(*) from g group by type_name order by count(*) desc, type_name limit 1),
    (select max(gift_date) from g),
    (select min(gift_date) from g);
$$;

comment on function public.event_statistics is
  'The full statistics panel for one wedding. Ties in most_common_type break alphabetically so the answer is stable between reads rather than flapping.';


-- ----------------------------------------------------------------------------
-- Global averages
-- ----------------------------------------------------------------------------

create or replace function public.global_averages(
  p_year     int  default null,
  p_event_id uuid default null,
  p_from     date default null,
  p_to       date default null
)
returns table (
  total_events            bigint,
  total_gifts             bigint,
  total_people            bigint,
  avg_gifts_per_event     numeric,
  avg_contributors_per_event numeric,
  avg_cash_per_event      jsonb,
  avg_livestock_per_event numeric,
  avg_gold_per_event      numeric
)
language sql
stable
as $$
  with e as (
    select * from public.filtered_events(p_year, p_event_id, p_from, p_to)
  ),
  g as (
    select gf.*, gt.category
    from public.filtered_gifts(p_year, p_event_id, null, null, p_from, p_to) gf
    join public.gift_types gt on gt.id = gf.gift_type_id
  ),
  event_count as (select count(*)::numeric as n from e)
  select
    (select count(*) from e),
    (select count(*) from g),
    (select count(distinct giver_name) from g),
    -- nullif guards the divide: with no events in scope the honest average is
    -- "no answer", not a division error and not zero.
    round((select count(*) from g)::numeric / nullif((select n from event_count), 0), 1),
    round(
      (select coalesce(sum(per_event.contributors), 0) from (
        select count(distinct giver_name) as contributors from g group by event_id
      ) per_event)::numeric / nullif((select n from event_count), 0),
      1
    ),
    -- Averaged per currency for the same reason totals are: a mean across
    -- UZS and USD would be a number with no unit.
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('currency_code', code, 'currency_symbol', symbol, 'total_amount', avg_amount)
          order by code
        ),
        '[]'::jsonb
      )
      from (
        select c.code, c.symbol, round(sum(g.amount) / nullif((select n from event_count), 0), 2) as avg_amount
        from g
        join public.currencies c on c.id = g.currency_id
        where g.amount is not null
        group by c.code, c.symbol
      ) per_currency
    ),
    round((select count(*) from g where category = 'livestock')::numeric / nullif((select n from event_count), 0), 1),
    round((select coalesce(sum(weight), 0) from g where category = 'precious') / nullif((select n from event_count), 0), 2);
$$;

comment on function public.global_averages is
  'Averages across every wedding in scope. Cash is averaged per currency, never blended.';


grant execute on function public.percent_change(numeric, numeric) to authenticated;
grant execute on function public.dashboard_totals(int, uuid, uuid, uuid, date, date) to authenticated;
grant execute on function public.event_statistics(uuid) to authenticated;
grant execute on function public.global_averages(int, uuid, date, date) to authenticated;
