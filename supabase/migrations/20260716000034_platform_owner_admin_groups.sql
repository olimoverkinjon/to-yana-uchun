-- Platform owner can promote any Telegram profile into an owner of their own
-- private group. Group admins still only manage their current group.

create or replace function public.ensure_user_owned_group(p_user_id uuid)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_group public.groups;
  v_base_slug text;
  v_slug text;
begin
  select * into v_profile from public.profiles where id = p_user_id and deleted_at is null;
  if not found then
    raise no_data_found using message = 'profile not found';
  end if;

  select g.* into v_group
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  where gm.user_id = p_user_id
    and gm.role = 'owner'
    and gm.deleted_at is null
    and g.deleted_at is null
  order by g.created_at asc
  limit 1;

  if found then
    return v_group;
  end if;

  v_base_slug := lower(regexp_replace(coalesce(v_profile.username, 'user-' || v_profile.telegram_id::text), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  if v_base_slug = '' then
    v_base_slug := 'user-' || v_profile.telegram_id::text;
  end if;
  v_slug := left(v_base_slug || '-' || substr(p_user_id::text, 1, 8), 80);

  insert into public.groups (name, slug, owner_id)
  values (
    trim(concat(v_profile.first_name, ' ', coalesce(v_profile.last_name, ''), ' guruhi')),
    v_slug,
    p_user_id
  )
  returning * into v_group;

  insert into public.group_members (group_id, user_id, role, invited_by)
  values (v_group.id, p_user_id, 'owner', auth.uid())
  on conflict (group_id, user_id) do update
    set role = 'owner',
        deleted_at = null,
        updated_at = now();

  return v_group;
end;
$$;

revoke execute on function public.ensure_user_owned_group(uuid) from public, anon, authenticated;

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
  v_group_id uuid;
  v_role_name text;
  v_group_role text;
begin
  select name into v_role_name from public.roles where id = p_role_id;
  if v_role_name is null then
    raise no_data_found using message = 'role not found';
  end if;

  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  if public.has_role('super_admin') then
    if v_role_name = 'super_admin' then
      perform public.ensure_user_owned_group(p_user_id);
      return;
    end if;

    v_group_id := public.current_group_id();
    if v_group_id is null then
      raise insufficient_privilege using message = 'platform owner has no active group';
    end if;
  else
    v_group_id := public.current_group_id();
    if v_group_id is null or not public.is_group_admin(v_group_id) then
      raise insufficient_privilege using message = 'only group admins can manage members';
    end if;
  end if;

  v_group_role := case when v_role_name = 'super_admin' then 'admin' else 'member' end;

  if exists (
    select 1
    from public.group_members
    where group_id = v_group_id
      and user_id = p_user_id
      and role = 'owner'
      and deleted_at is null
  ) then
    raise insufficient_privilege using message = 'group owner role cannot be changed';
  end if;

  insert into public.group_members (group_id, user_id, role, invited_by)
  values (v_group_id, p_user_id, v_group_role, auth.uid())
  on conflict (group_id, user_id) do update
    set role = excluded.role,
        deleted_at = null,
        updated_at = now();
end;
$$;
