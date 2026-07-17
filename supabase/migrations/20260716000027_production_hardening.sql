-- ============================================================================
-- Phase 7 production hardening indexes
-- ============================================================================
-- These indexes match hot production paths that are intentionally user-facing:
-- global gift search, audit filtering, auth/session activity, and admin lists.
-- ============================================================================

create index if not exists gifts_description_trgm_idx
  on public.gifts using gin (description extensions.gin_trgm_ops)
  where deleted_at is null and description is not null;

create index if not exists gifts_notes_trgm_idx
  on public.gifts using gin (notes extensions.gin_trgm_ops)
  where deleted_at is null and notes is not null;

create index if not exists gifts_live_amount_idx
  on public.gifts (amount desc)
  where deleted_at is null and amount is not null;

create index if not exists audit_logs_severity_created_idx
  on public.audit_logs (severity, created_at desc, id desc);

create index if not exists audit_logs_telegram_created_idx
  on public.audit_logs (telegram_user_id, created_at desc)
  where telegram_user_id is not null;

create index if not exists activity_logs_user_action_created_idx
  on public.activity_logs (user_id, action, created_at desc);

create index if not exists system_logs_level_created_idx
  on public.system_logs (level, created_at desc);

insert into public.system_logs (source, level, message, metadata)
values ('migration', 'info', 'Production hardening indexes installed', jsonb_build_object('phase', 7))
on conflict do nothing;
