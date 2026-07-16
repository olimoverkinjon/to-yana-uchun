-- ============================================================================
-- Permission helper functions
-- ============================================================================
-- auth.uid() is provided by Supabase's platform (reads the `sub` claim of
-- the request's verified JWT). This project has no Supabase Auth user
-- behind it — the Next.js server verifies Telegram's initData itself and
-- mints a Supabase-compatible JWT whose `sub` is profiles.id, specifically
-- so auth.uid() resolves correctly here without ever touching auth.users.
-- ============================================================================

create or replace function public.has_role(p_role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.deleted_at is null
      and r.name = p_role_name
  );
$$;

comment on function public.has_role(text) is
  'True if the current JWT''s subject holds an active (non-revoked) grant of the named role. security definer so a Viewer (who cannot SELECT other rows in user_roles) can still evaluate this for their own permission checks.';

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select public.has_role('super_admin');
$$;

create or replace function public.is_viewer_or_above()
returns boolean
language sql
stable
as $$
  select public.has_role('viewer') or public.has_role('super_admin');
$$;

comment on function public.is_viewer_or_above() is
  'Anyone with an active grant of any role. Super Admin implies Viewer-level read access — no need to also grant a separate "viewer" row to a Super Admin.';


-- ============================================================================
-- Telegram identity upsert
-- ============================================================================
-- The single, centralized "every Telegram user automatically gets a
-- profile" implementation. Called from the Next.js auth route via the
-- service-role client (i.e. before any session/JWT exists for this user —
-- there is nothing for RLS to check yet, which is exactly why this must be
-- security definer and is never exposed to the authenticated/anon roles).
-- ============================================================================

create or replace function public.upsert_telegram_profile(
  p_telegram_id   bigint,
  p_username      text,
  p_first_name    text,
  p_last_name     text,
  p_photo_url     text,
  p_language_code text,
  p_is_premium    boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  insert into public.profiles as p (
    telegram_id, username, first_name, last_name, photo_url, language_code, is_premium, last_seen_at
  )
  values (
    p_telegram_id, p_username, p_first_name, p_last_name, p_photo_url, p_language_code,
    coalesce(p_is_premium, false), now()
  )
  on conflict (telegram_id) do update set
    username      = excluded.username,
    first_name    = excluded.first_name,
    last_name     = excluded.last_name,
    photo_url     = excluded.photo_url,
    language_code = excluded.language_code,
    is_premium    = excluded.is_premium,
    last_seen_at  = now(),
    deleted_at    = null -- a returning Telegram user always reactivates their own profile
  returning * into v_profile;

  return v_profile;
end;
$$;

comment on function public.upsert_telegram_profile is
  'Create-or-refresh a profile from verified Telegram initData. security definer: called via the service-role client before any user session/JWT exists, so there is nothing for RLS to check yet.';

revoke execute on function public.upsert_telegram_profile from public, anon, authenticated;


-- ============================================================================
-- Per-request context for audit metadata
-- ============================================================================
-- audit_row_change() (triggers migration) needs facts the database cannot
-- observe on its own: the HTTP request's IP/User-Agent, a parsed
-- browser/OS, and an optional human-entered reason for the change. The app
-- sets these as transaction-local session variables immediately before a
-- mutation via this one RPC, instead of four separate set_config() calls
-- scattered through application code.
-- ============================================================================

create or replace function public.set_request_context(
  p_ip_address inet default null,
  p_user_agent text default null,
  p_browser    text default null,
  p_os         text default null,
  p_reason     text default null
)
returns void
language plpgsql
as $$
begin
  perform set_config('app.request_ip', coalesce(host(p_ip_address), ''), true);
  perform set_config('app.user_agent', coalesce(p_user_agent, ''), true);
  perform set_config('app.browser', coalesce(p_browser, ''), true);
  perform set_config('app.os', coalesce(p_os, ''), true);
  perform set_config('app.change_reason', coalesce(p_reason, ''), true);
end;
$$;

comment on function public.set_request_context is
  'Stashes per-request metadata as transaction-local (true = is_local) settings for audit_row_change() to pick up. Call once per request, before any mutating statement, in the same transaction.';


-- ============================================================================
-- Lightweight session bookkeeping
-- ============================================================================
-- Deliberately not routed through the generic audit trigger: touching this
-- on every single app open would flood audit_logs with routine session
-- noise that has nothing to do with the data-mutation trail the PRD asks
-- audit_logs to preserve.
-- ============================================================================

create or replace function public.touch_profile_last_seen(p_profile_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set last_seen_at = now() where id = p_profile_id;
$$;

revoke execute on function public.touch_profile_last_seen from public, anon, authenticated;
