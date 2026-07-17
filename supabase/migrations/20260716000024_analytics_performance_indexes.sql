-- ============================================================================
-- Phase 4 analytics performance indexes
-- ============================================================================
-- The dashboard aggregate RPCs intentionally calculate from live rows, not
-- denormalized counters. These partial indexes keep those scans narrow as the
-- gifts table grows past 100k rows.
--
-- All indexes ignore soft-deleted rows because every dashboard helper does the
-- same. That keeps index size down and matches the product's read surface.
-- ============================================================================

create index if not exists gifts_live_event_type_currency_date_idx
  on public.gifts (event_id, gift_type_id, currency_id, gift_date desc)
  where deleted_at is null;

create index if not exists gifts_live_created_at_idx
  on public.gifts (created_at desc)
  where deleted_at is null;

create index if not exists gifts_live_updated_at_idx
  on public.gifts (updated_at desc)
  where deleted_at is null;

create index if not exists gifts_live_giver_event_date_idx
  on public.gifts (giver_name, event_id, gift_date desc)
  where deleted_at is null;

create index if not exists events_live_year_date_idx
  on public.events (event_year, event_date desc)
  where deleted_at is null;

create index if not exists events_live_created_at_idx
  on public.events (created_at desc)
  where deleted_at is null;

create index if not exists events_live_updated_at_idx
  on public.events (updated_at desc)
  where deleted_at is null;

create index if not exists activity_logs_action_created_at_idx
  on public.activity_logs (action, created_at desc);
