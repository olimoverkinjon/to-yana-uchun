-- ============================================================================
-- Phase 5 admin system
-- ============================================================================
-- Super Admin actions go through RPCs so permission checks, request context,
-- soft-delete semantics, and audit logging stay server-side and consistent.
-- ============================================================================

create index if not exists profiles_admin_search_idx
  on public.profiles using gin (
    (coalesce(username, '') || ' ' || first_name || ' ' || coalesce(last_name, '') || ' ' || telegram_id::text)
    extensions.gin_trgm_ops
  );

create index if not exists profiles_admin_created_idx on public.profiles (created_at desc);
create index if not exists profiles_admin_last_seen_idx on public.profiles (last_seen_at desc nulls last);
create index if not exists settings_key_trgm_idx on public.settings using gin (key extensions.gin_trgm_ops);
create index if not exists attachments_admin_created_idx on public.attachments (created_at desc);

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
    last_seen_at  = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

comment on function public.upsert_telegram_profile is
  'Create-or-refresh a profile from verified Telegram initData without clearing admin disable state.';

-- User disable/restore is the only profile mutation the admin panel performs.
-- Profile refreshes from Telegram login update last_seen_at and should not flood
-- the audit trail; role changes are already audited through user_roles.
create trigger audit_profile_disable_restore after update of deleted_at on public.profiles
  for each row execute function public.audit_row_change();

create or replace function public.admin_set_user_disabled(
  p_user_id uuid,
  p_disabled boolean,
  p_reason text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser text default null,
  p_os text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_super_admin() then
    raise insufficient_privilege using message = 'only super admins can manage users';
  end if;

  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  update public.profiles
  set deleted_at = case when p_disabled then coalesce(deleted_at, now()) else null end
  where id = p_user_id
  returning * into v_profile;

  if not found then
    raise no_data_found using message = 'profile not found';
  end if;

  return v_profile;
end;
$$;

create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role_id uuid,
  p_reason text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser text default null,
  p_os text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant_id uuid;
begin
  if not public.is_super_admin() then
    raise insufficient_privilege using message = 'only super admins can manage roles';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise no_data_found using message = 'profile not found';
  end if;

  if not exists (select 1 from public.roles where id = p_role_id) then
    raise no_data_found using message = 'role not found';
  end if;

  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  update public.user_roles
  set deleted_at = now()
  where user_id = p_user_id and deleted_at is null and role_id <> p_role_id;

  select id into v_grant_id
  from public.user_roles
  where user_id = p_user_id and role_id = p_role_id and deleted_at is null
  limit 1;

  if v_grant_id is null then
    insert into public.user_roles (user_id, role_id, granted_by)
    values (p_user_id, p_role_id, auth.uid());
  end if;
end;
$$;

create or replace function public.admin_update_setting(
  p_key text,
  p_value jsonb,
  p_description text default null,
  p_reason text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser text default null,
  p_os text default null
)
returns public.settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_setting public.settings;
begin
  if not public.is_super_admin() then
    raise insufficient_privilege using message = 'only super admins can manage settings';
  end if;

  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  insert into public.settings (key, value, description, updated_by)
  values (p_key, p_value, p_description, auth.uid())
  on conflict (key) do update set
    value = excluded.value,
    description = coalesce(excluded.description, public.settings.description),
    updated_by = auth.uid()
  returning * into v_setting;

  return v_setting;
end;
$$;

create or replace function public.admin_set_attachment_deleted(
  p_attachment_id uuid,
  p_deleted boolean,
  p_reason text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser text default null,
  p_os text default null
)
returns public.attachments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attachment public.attachments;
begin
  if not public.is_super_admin() then
    raise insufficient_privilege using message = 'only super admins can manage files';
  end if;

  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  update public.attachments
  set deleted_at = case when p_deleted then coalesce(deleted_at, now()) else null end
  where id = p_attachment_id
  returning * into v_attachment;

  if not found then
    raise no_data_found using message = 'attachment not found';
  end if;

  return v_attachment;
end;
$$;

grant execute on function public.admin_set_user_disabled(uuid, boolean, text, text, text, text, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, uuid, text, text, text, text, text) to authenticated;
grant execute on function public.admin_update_setting(text, jsonb, text, text, text, text, text, text) to authenticated;
grant execute on function public.admin_set_attachment_deleted(uuid, boolean, text, text, text, text, text) to authenticated;
