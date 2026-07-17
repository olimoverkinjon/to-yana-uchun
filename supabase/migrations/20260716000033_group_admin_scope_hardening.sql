-- Group admins may manage their own group, but must not become platform-wide
-- operators just because the legacy UI calls the permission "super admin".

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
  v_group_id uuid;
begin
  v_group_id := public.current_group_id();
  if v_group_id is null or not public.is_group_admin(v_group_id) then
    raise insufficient_privilege using message = 'only group admins can manage users';
  end if;

  if exists (
    select 1
    from public.group_members
    where group_id = v_group_id
      and user_id = p_user_id
      and role = 'owner'
      and deleted_at is null
  ) then
    raise insufficient_privilege using message = 'group owner cannot be disabled';
  end if;

  if not exists (
    select 1
    from public.group_members
    where group_id = v_group_id
      and user_id = p_user_id
      and deleted_at is null
  ) then
    raise no_data_found using message = 'profile is not in your group';
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
  if not public.has_role('super_admin') then
    raise insufficient_privilege using message = 'only platform owners can manage settings';
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

drop policy if exists "super admins insert settings" on public.settings;
drop policy if exists "super admins update settings" on public.settings;

create policy "platform owners insert settings" on public.settings
  for insert
  with check (public.has_role('super_admin'));

create policy "platform owners update settings" on public.settings
  for update
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));
