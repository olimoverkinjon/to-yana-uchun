-- ============================================================================
-- audit_logs
-- ============================================================================
-- The permanent, tamper-evident trail: every INSERT/UPDATE/DELETE/RESTORE on
-- an audited table writes one row here (see audit_row_change() in the
-- triggers migration). This table deliberately has no updated_at and no
-- deleted_at — adding either would imply a row here could ever change or be
-- removed, which contradicts the one property that matters most: "Audit
-- Logs must never be editable." Immutability is enforced twice, in depth:
--   1. RLS denies UPDATE/DELETE to every client role outright.
--   2. A BEFORE UPDATE OR DELETE trigger (prevent_audit_log_mutation, in the
--      triggers migration) raises an exception even for roles that could
--      otherwise bypass RLS.
-- ============================================================================

create table public.audit_logs (
  id               uuid primary key default gen_random_uuid(),
  table_name       text not null,
  record_id        uuid not null,
  action           text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')),
  old_data         jsonb,
  new_data         jsonb,
  changed_by       uuid references public.profiles (id) on delete set null,
  -- Denormalized on purpose: if a profile is later renamed or deactivated,
  -- this row must still say who it was *at the time*, independent of
  -- changed_by's current state.
  telegram_user_id bigint,
  reason           text,
  ip_address       inet,
  user_agent       text,
  browser          text,
  os               text,
  created_at       timestamptz not null default now()
);

comment on table public.audit_logs is
  'Immutable record of every mutation to an audited table. Never updated, never deleted — see prevent_audit_log_mutation trigger and its RLS policies.';
comment on column public.audit_logs.action is
  'RESTORE is not a native Postgres operation — it is an UPDATE that clears deleted_at, detected and relabeled by the audit_row_change trigger.';
comment on column public.audit_logs.browser is
  'Parsed from the User-Agent by the Next.js server (a proper UA-parsing library, not SQL regex) and passed in via set_request_context() before the mutation runs.';

-- "History of this specific row" (a gift's or event's full timeline) is the
-- primary way this table gets read, via the super-admin-only UI.
create index audit_logs_table_record_idx on public.audit_logs (table_name, record_id, created_at desc);
create index audit_logs_changed_by_idx on public.audit_logs (changed_by);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
