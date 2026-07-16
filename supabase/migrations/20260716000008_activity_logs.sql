-- ============================================================================
-- activity_logs
-- ============================================================================
-- Behavioral telemetry (login, logout, search, language/theme change, event
-- and gift views) — distinct in kind from audit_logs. audit_logs is a
-- permanent legal/trust record of *data mutations* and must never be
-- deleted; activity_logs is operational usage data that a future retention
-- job may legitimately prune. That difference is why this table has no
-- trigger blocking DELETE, unlike audit_logs, even though neither table has
-- an updated_at/deleted_at pair (both are append-only by nature — an
-- activity event doesn't get "edited").
-- ============================================================================

create table public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete set null,
  action     text not null check (
    action in ('login', 'logout', 'search', 'language_change', 'theme_change', 'event_view', 'gift_view')
  ),
  -- Free-form per-action payload, e.g. {"query": "Aziz"} for search,
  -- {"language": "ru"} for language_change, {"event_id": "..."} for
  -- event_view. jsonb (not a wider table) because this list of action types
  -- — and what each one needs to record — will keep growing, and a rigid
  -- column-per-fact schema would need a migration every time it does.
  metadata   jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.activity_logs is
  'Usage telemetry (login/logout/search/theme/language/view events), prunable by retention policy — unlike audit_logs, which must never be deleted.';

create index activity_logs_user_id_idx on public.activity_logs (user_id, created_at desc);
create index activity_logs_action_idx on public.activity_logs (action);
create index activity_logs_created_at_idx on public.activity_logs (created_at desc);
