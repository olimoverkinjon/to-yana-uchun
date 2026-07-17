-- ============================================================================
-- Activity logging and search analytics
-- ============================================================================
-- activity_logs was created in Phase 2 but nothing has ever written to it. The
-- dashboard's "recent searches / most searched names / most opened events"
-- panel reads from it, so without this the panel would be decoration — a
-- component rendering an empty array forever, or worse, invented numbers.
--
-- Note the difference from audit_logs. audit_logs is the permanent, immutable
-- record of *data mutations*, written by a trigger so the app cannot forget.
-- activity_logs is *behavioural telemetry* — what people searched for, what
-- they opened — which no trigger can observe, because reading a page is not a
-- database write. So this one is called explicitly by the app.
-- ============================================================================

create or replace function public.log_activity(
  p_action     text,
  p_metadata   jsonb default '{}'::jsonb,
  p_ip_address text  default null,
  p_user_agent text  default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip inet;
begin
  -- No session, nothing to attribute. Silently ignored rather than raised:
  -- telemetry must never be the thing that breaks a page.
  if auth.uid() is null then
    return;
  end if;

  begin
    v_ip := nullif(p_ip_address, '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.activity_logs (user_id, action, metadata, ip_address, user_agent)
  values (auth.uid(), p_action, coalesce(p_metadata, '{}'::jsonb), v_ip, p_user_agent);
exception
  -- An unknown action violates the CHECK constraint. A rejected telemetry row
  -- is not worth failing the user's actual request over.
  when others then
    return;
end;
$$;

comment on function public.log_activity is
  'Records one behavioural event for the current user. Fails silently by design — telemetry must never break the page it is observing. security definer so the insert does not depend on the caller''s own policy on activity_logs.';

revoke execute on function public.log_activity(text, jsonb, text, text) from public, anon;
grant execute on function public.log_activity(text, jsonb, text, text) to authenticated;

-- Reading "most searched names" means grouping by metadata->>'query' over the
-- search rows; without this the panel scans every activity row ever written.
create index activity_logs_search_query_idx
  on public.activity_logs ((metadata ->> 'query'))
  where action = 'search';

create index activity_logs_event_view_idx
  on public.activity_logs ((metadata ->> 'event_id'))
  where action = 'event_view';


-- ----------------------------------------------------------------------------
-- search_analytics
-- ----------------------------------------------------------------------------
-- Super-admin-only: this is a record of what individuals looked for, which is
-- a different kind of data from the ledger itself. RLS on activity_logs
-- already restricts a Viewer to their own rows, so the is_super_admin() guard
-- here is about not presenting a personalised list as if it were global.
-- ----------------------------------------------------------------------------

create or replace function public.search_analytics(
  p_limit int  default 10,
  p_days  int  default 90
)
returns table (
  recent_searches   jsonb,
  top_search_terms  jsonb,
  most_opened_events jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with scope as (
    select * from public.activity_logs
    where created_at >= now() - (p_days || ' days')::interval
      and public.is_super_admin()
  )
  select
    (
      select coalesce(jsonb_agg(row_to_json(r) order by r.created_at desc), '[]'::jsonb)
      from (
        select metadata ->> 'query' as query, created_at
        from scope
        where action = 'search' and coalesce(metadata ->> 'query', '') <> ''
        order by created_at desc
        limit p_limit
      ) r
    ),
    (
      select coalesce(jsonb_agg(row_to_json(r) order by r.search_count desc), '[]'::jsonb)
      from (
        select lower(metadata ->> 'query') as query, count(*) as search_count
        from scope
        where action = 'search' and coalesce(metadata ->> 'query', '') <> ''
        -- Grouped case-insensitively: "Aziz" and "aziz" are one search term,
        -- and splitting them would make every term look rarer than it is.
        group by lower(metadata ->> 'query')
        order by count(*) desc, lower(metadata ->> 'query')
        limit p_limit
      ) r
    ),
    (
      select coalesce(jsonb_agg(row_to_json(r) order by r.view_count desc), '[]'::jsonb)
      from (
        select
          v.event_id,
          e.title,
          v.view_count
        from (
          select (metadata ->> 'event_id')::uuid as event_id, count(*) as view_count
          from scope
          where action = 'event_view'
            and coalesce(metadata ->> 'event_id', '') <> ''
          group by (metadata ->> 'event_id')::uuid
        ) v
        -- An inner join, so a view of a since-deleted event drops out rather
        -- than rendering as a nameless row nobody can click.
        join public.events e on e.id = v.event_id and e.deleted_at is null
        order by v.view_count desc, e.title
        limit p_limit
      ) r
    );
$$;

comment on function public.search_analytics is
  'What people have been searching for and opening. Returns empty arrays for a non-super-admin rather than another user''s history.';

grant execute on function public.search_analytics(int, int) to authenticated;
