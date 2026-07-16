-- ============================================================================
-- Realtime
-- ============================================================================
-- Postgres Changes are enabled for events, gifts, and audit_logs: a Super
-- Admin's dashboard and an event's gift list update live for every open
-- session as soon as a mutation commits, without polling. Realtime enforces
-- the same RLS policies defined above per subscriber — a Viewer's socket
-- receives events/gifts changes (per their SELECT policy) but never
-- audit_logs changes (Super Admin only), automatically, with no separate
-- Realtime-specific authorization rules to maintain.
--
-- "Dashboard" is not itself a table, so there is nothing to publish for it
-- directly — dashboard_stats is a view (views cannot be added to a logical
-- replication publication). The client achieves the same live-update effect
-- by subscribing to events/gifts changes and refetching dashboard_stats
-- when either fires.
--
-- Wrapped in existence checks so this migration is safe to re-run: the
-- `supabase_realtime` publication already exists by default on every
-- Supabase project (hosted or local CLI), and re-adding an already-added
-- table to a publication raises an error rather than being a no-op.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gifts'
  ) then
    alter publication supabase_realtime add table public.gifts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audit_logs'
  ) then
    alter publication supabase_realtime add table public.audit_logs;
  end if;
end $$;
