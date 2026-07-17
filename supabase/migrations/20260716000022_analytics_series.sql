-- ============================================================================
-- Time series and distributions — the data behind the charts
-- ============================================================================
-- Each of these returns a chart-ready series. They generate their own
-- continuous axis where one is needed (generate_series) rather than returning
-- only the months that happen to have data: a gap-free axis is the difference
-- between "nothing was recorded in March" and "March does not exist", and a
-- chart that silently omits empty periods misstates the shape of the trend.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Gifts per month
-- ----------------------------------------------------------------------------
-- On gift_date, not created_at: this chart answers "when were gifts given",
-- which is a fact about the weddings. (dashboard_totals' trend uses created_at
-- instead, because it asks a different question — see that migration.)
-- ----------------------------------------------------------------------------

create or replace function public.gifts_by_month(
  p_months       int  default 12,
  p_year         int  default null,
  p_event_id     uuid default null,
  p_gift_type_id uuid default null,
  p_currency_id  uuid default null,
  p_from         date default null,
  p_to           date default null
)
returns table (
  bucket       date,
  gift_count   bigint,
  contributors bigint
)
language sql
stable
as $$
  with axis as (
    select generate_series(
      date_trunc('month', current_date) - ((p_months - 1) || ' months')::interval,
      date_trunc('month', current_date),
      '1 month'
    )::date as bucket
  ),
  g as (
    select * from public.filtered_gifts(p_year, p_event_id, p_gift_type_id, p_currency_id, p_from, p_to)
  )
  select
    axis.bucket,
    count(g.id),
    count(distinct g.giver_name)
  from axis
  left join g on date_trunc('month', g.gift_date)::date = axis.bucket
  group by axis.bucket
  order by axis.bucket;
$$;

comment on function public.gifts_by_month is
  'Gift counts per month over a trailing window, with empty months present as zeroes so the axis has no holes.';


-- ----------------------------------------------------------------------------
-- Gifts per year
-- ----------------------------------------------------------------------------
-- The axis spans the data's own range rather than a trailing window: this
-- ledger's whole point is that it reaches back decades, and clipping it to the
-- last N years would hide exactly the history it exists to keep.
-- ----------------------------------------------------------------------------

create or replace function public.gifts_by_year(
  p_year         int  default null,
  p_event_id     uuid default null,
  p_gift_type_id uuid default null,
  p_currency_id  uuid default null,
  p_from         date default null,
  p_to           date default null
)
returns table (
  bucket       int,
  gift_count   bigint,
  contributors bigint
)
language sql
stable
as $$
  with g as (
    select gf.*, e.event_year
    from public.filtered_gifts(p_year, p_event_id, p_gift_type_id, p_currency_id, p_from, p_to) gf
    join public.events e on e.id = gf.event_id
  ),
  bounds as (
    select min(event_year) as lo, max(event_year) as hi from g
  ),
  axis as (
    select generate_series(coalesce(lo, 0), coalesce(hi, -1))::int as bucket from bounds
  )
  select
    axis.bucket,
    count(g.id),
    count(distinct g.giver_name)
  from axis
  left join g on g.event_year = axis.bucket
  group by axis.bucket
  order by axis.bucket;
$$;

comment on function public.gifts_by_year is
  'Gift counts per wedding year across the data''s full range. Empty when there are no gifts (the generate_series bounds collapse), rather than inventing a year.';


create or replace function public.events_by_year(
  p_year     int  default null,
  p_event_id uuid default null,
  p_from     date default null,
  p_to       date default null
)
returns table (
  bucket      int,
  event_count bigint
)
language sql
stable
as $$
  with e as (
    select * from public.filtered_events(p_year, p_event_id, p_from, p_to)
  ),
  bounds as (
    select min(event_year) as lo, max(event_year) as hi from e
  ),
  axis as (
    select generate_series(coalesce(lo, 0), coalesce(hi, -1))::int as bucket from bounds
  )
  select axis.bucket, count(e.id)
  from axis
  left join e on e.event_year = axis.bucket
  group by axis.bucket
  order by axis.bucket;
$$;


-- ----------------------------------------------------------------------------
-- Distributions
-- ----------------------------------------------------------------------------

create or replace function public.gift_type_distribution(
  p_year        int  default null,
  p_event_id    uuid default null,
  p_currency_id uuid default null,
  p_from        date default null,
  p_to          date default null
)
returns table (
  gift_type_id   uuid,
  gift_type_name text,
  gift_type_slug text,
  category       text,
  gift_count     bigint,
  total_weight   numeric,
  share_pct      numeric
)
language sql
stable
as $$
  with g as (
    select gf.*, gt.id as type_id, gt.name as type_name, gt.slug as type_slug, gt.category as type_category
    from public.filtered_gifts(p_year, p_event_id, null, p_currency_id, p_from, p_to) gf
    join public.gift_types gt on gt.id = gf.gift_type_id
  ),
  total as (select count(*)::numeric as n from g)
  select
    type_id,
    type_name,
    type_slug,
    type_category,
    count(*),
    sum(weight),
    round((count(*)::numeric / nullif((select n from total), 0)) * 100, 1)
  from g
  group by type_id, type_name, type_slug, type_category
  order by count(*) desc, type_name;
$$;

comment on function public.gift_type_distribution is
  'Every gift type in scope with its count and share. Ordered by count so the chart can fold the tail into "Other" rather than minting a ninth colour for it.';


create or replace function public.cash_distribution(
  p_year     int  default null,
  p_event_id uuid default null,
  p_from     date default null,
  p_to       date default null
)
returns table (
  currency_id     uuid,
  currency_code   text,
  currency_symbol text,
  total_amount    numeric,
  gift_count      bigint,
  -- Share *within its own currency's ledger* is meaningless; this is the
  -- share of cash-gift records, not of value. Comparing value across
  -- currencies would need an exchange rate this app deliberately does not
  -- pretend to have.
  count_share_pct numeric
)
language sql
stable
as $$
  with g as (
    select * from public.filtered_gifts(p_year, p_event_id, null, null, p_from, p_to)
    where amount is not null and currency_id is not null
  ),
  total as (select count(*)::numeric as n from g)
  select
    c.id,
    c.code,
    c.symbol,
    sum(g.amount),
    count(*),
    round((count(*)::numeric / nullif((select n from total), 0)) * 100, 1)
  from g
  join public.currencies c on c.id = g.currency_id
  group by c.id, c.code, c.symbol
  order by count(*) desc, c.code;
$$;

comment on function public.cash_distribution is
  'Cash totals per currency. The share column counts records, not value — there is no exchange rate here, by design.';


-- ----------------------------------------------------------------------------
-- Contributors growth
-- ----------------------------------------------------------------------------
-- Cumulative distinct givers over time: each month counts everyone seen up to
-- and including it, so the line only ever rises. A per-month count of distinct
-- givers would look like churn ("we lost contributors") when it really means
-- "no wedding happened that month".
-- ----------------------------------------------------------------------------

create or replace function public.contributors_growth(
  p_months   int  default 24,
  p_year     int  default null,
  p_event_id uuid default null,
  p_from     date default null,
  p_to       date default null
)
returns table (
  bucket            date,
  total_contributors bigint,
  new_contributors   bigint
)
language sql
stable
as $$
  with g as (
    select * from public.filtered_gifts(p_year, p_event_id, null, null, p_from, p_to)
  ),
  -- The month each person first appears; that is what makes them "new".
  first_seen as (
    select giver_name, date_trunc('month', min(gift_date))::date as first_month
    from g
    group by giver_name
  ),
  axis as (
    select generate_series(
      date_trunc('month', current_date) - ((p_months - 1) || ' months')::interval,
      date_trunc('month', current_date),
      '1 month'
    )::date as bucket
  )
  select
    axis.bucket,
    (select count(*) from first_seen fs where fs.first_month <= axis.bucket),
    (select count(*) from first_seen fs where fs.first_month = axis.bucket)
  from axis
  order by axis.bucket;
$$;

comment on function public.contributors_growth is
  'Cumulative distinct givers per month, plus how many were new that month. Monotonic by construction.';


-- ----------------------------------------------------------------------------
-- Top contributors
-- ----------------------------------------------------------------------------

create or replace function public.top_contributors(
  p_limit    int  default 10,
  p_year     int  default null,
  p_event_id uuid default null,
  p_from     date default null,
  p_to       date default null
)
returns table (
  giver_name     text,
  gift_count     bigint,
  cash_totals    jsonb,
  last_gift_date date,
  event_count    bigint
)
language sql
stable
as $$
  with g as (
    select * from public.filtered_gifts(p_year, p_event_id, null, null, p_from, p_to)
  )
  select
    g.giver_name,
    count(*),
    -- Per currency again. Ranking is by gift count rather than by value for
    -- exactly this reason: there is no exchange rate, so "who gave the most"
    -- by value is not answerable across currencies without inventing one.
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('currency_code', code, 'currency_symbol', symbol, 'total_amount', total)
          order by code
        )
        from (
          select c.code, c.symbol, sum(g2.amount) as total
          from g g2
          join public.currencies c on c.id = g2.currency_id
          where g2.giver_name = g.giver_name and g2.amount is not null
          group by c.code, c.symbol
        ) per_currency
      ),
      '[]'::jsonb
    ),
    max(g.gift_date),
    count(distinct g.event_id)
  from g
  group by g.giver_name
  order by count(*) desc, max(g.gift_date) desc, g.giver_name
  limit greatest(p_limit, 0);
$$;

comment on function public.top_contributors is
  'The most frequent givers. Ranked by gift count, not value — see the inline note. Ties break by recency then name, so the order is stable between reads.';


grant execute on function public.gifts_by_month(int, int, uuid, uuid, uuid, date, date) to authenticated;
grant execute on function public.gifts_by_year(int, uuid, uuid, uuid, date, date) to authenticated;
grant execute on function public.events_by_year(int, uuid, date, date) to authenticated;
grant execute on function public.gift_type_distribution(int, uuid, uuid, date, date) to authenticated;
grant execute on function public.cash_distribution(int, uuid, date, date) to authenticated;
grant execute on function public.contributors_growth(int, int, uuid, date, date) to authenticated;
grant execute on function public.top_contributors(int, int, uuid, date, date) to authenticated;
