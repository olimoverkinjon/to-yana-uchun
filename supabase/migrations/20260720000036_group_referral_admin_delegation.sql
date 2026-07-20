-- ============================================================================
-- Group referral/admin delegation
-- ============================================================================
-- Platform owner can create separate private ledgers through bot-generated
-- invite links. Group owners/admins can delegate admin access only inside their
-- current group; no group admin receives platform-wide power.
-- ============================================================================

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

    v_group_role := 'member';
  else
    v_group_id := public.current_group_id();
    if v_group_id is null or not public.is_group_admin(v_group_id) then
      raise insufficient_privilege using message = 'only group admins can manage members';
    end if;

    v_group_role := case when v_role_name = 'super_admin' then 'admin' else 'member' end;
  end if;

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
