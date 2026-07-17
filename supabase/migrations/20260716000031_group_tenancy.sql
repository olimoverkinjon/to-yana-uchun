-- ============================================================================
-- Group tenancy and invite/referral access
-- ============================================================================
-- The app is now global, but every wedding ledger belongs to exactly one
-- private group. Members can read their group; group owners/admins can mutate
-- it. The original owner keeps the existing data in a default group.
-- ============================================================================

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  invite_code text not null unique default lower(replace(gen_random_uuid()::text, '-', '')),
  owner_id    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,

  constraint groups_name_length_check check (char_length(name) between 1 and 160),
  constraint groups_slug_length_check check (char_length(slug) between 1 and 80),
  constraint groups_invite_code_length_check check (char_length(invite_code) between 6 and 80)
);

create table if not exists public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('owner', 'admin', 'member')),
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at  timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint group_members_unique_active unique (group_id, user_id)
);

create trigger set_updated_at before update on public.groups
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.group_members
  for each row execute function public.set_updated_at();

create index if not exists groups_owner_idx on public.groups (owner_id) where deleted_at is null;
create index if not exists groups_invite_code_idx on public.groups (invite_code) where deleted_at is null;
create index if not exists group_members_user_idx on public.group_members (user_id, group_id) where deleted_at is null;
create index if not exists group_members_group_role_idx on public.group_members (group_id, role) where deleted_at is null;

alter table public.events add column if not exists group_id uuid references public.groups (id) on delete restrict;
alter table public.activity_logs add column if not exists group_id uuid references public.groups (id) on delete set null;
alter table public.audit_logs add column if not exists group_id uuid references public.groups (id) on delete set null;

create index if not exists events_group_active_idx on public.events (group_id, event_year desc, event_date desc) where deleted_at is null;
create index if not exists activity_logs_group_created_idx on public.activity_logs (group_id, created_at desc);
create index if not exists audit_logs_group_created_idx on public.audit_logs (group_id, created_at desc, id desc);

do $$
declare
  v_owner_id uuid;
  v_group_id uuid;
begin
  select p.id into v_owner_id
  from public.profiles p
  where p.telegram_id = 6653845419
  limit 1;

  if v_owner_id is null then
    select ur.user_id into v_owner_id
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where r.name = 'super_admin'
      and ur.deleted_at is null
    order by ur.created_at asc
    limit 1;
  end if;

  if v_owner_id is not null then
    insert into public.groups (name, slug, invite_code, owner_id)
    values ('Erkinjon Olimov sinfdoshlari', 'erkinjon-olimov-sinfdoshlari', 'erkinjon-sinfdoshlar', v_owner_id)
    on conflict (slug) do update set owner_id = excluded.owner_id, deleted_at = null
    returning id into v_group_id;

    insert into public.group_members (group_id, user_id, role, invited_by)
    values (v_group_id, v_owner_id, 'owner', null)
    on conflict (group_id, user_id) do update set role = 'owner', deleted_at = null, updated_at = now();

    update public.events set group_id = v_group_id where group_id is null;
    update public.activity_logs set group_id = v_group_id where group_id is null and user_id = v_owner_id;
  end if;
end $$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.group_members gm on gm.user_id = p.id
    join public.groups g on g.id = gm.group_id
    where p.id = auth.uid()
      and p.deleted_at is null
      and gm.group_id = p_group_id
      and gm.deleted_at is null
      and g.deleted_at is null
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.group_members gm on gm.user_id = p.id
    join public.groups g on g.id = gm.group_id
    where p.id = auth.uid()
      and p.deleted_at is null
      and gm.group_id = p_group_id
      and gm.role in ('owner', 'admin')
      and gm.deleted_at is null
      and g.deleted_at is null
  );
$$;

create or replace function public.current_group_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gm.group_id
  from public.profiles p
  join public.group_members gm on gm.user_id = p.id
  join public.groups g on g.id = gm.group_id
  where p.id = auth.uid()
    and p.deleted_at is null
    and gm.deleted_at is null
    and g.deleted_at is null
  order by
    case gm.role when 'owner' then 1 when 'admin' then 2 else 3 end,
    gm.joined_at asc
  limit 1;
$$;

create or replace function public.has_role(p_role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    join public.roles r on r.id = ur.role_id
    where p.id = auth.uid()
      and p.deleted_at is null
      and ur.deleted_at is null
      and r.name = p_role_name
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select public.has_role('super_admin')
    or exists (
      select 1
      from public.group_members gm
      join public.profiles p on p.id = gm.user_id
      join public.groups g on g.id = gm.group_id
      where p.id = auth.uid()
        and p.deleted_at is null
        and gm.role in ('owner', 'admin')
        and gm.deleted_at is null
        and g.deleted_at is null
    );
$$;

create or replace function public.is_viewer_or_above()
returns boolean
language sql
stable
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.group_members gm
      join public.profiles p on p.id = gm.user_id
      join public.groups g on g.id = gm.group_id
      where p.id = auth.uid()
        and p.deleted_at is null
        and gm.deleted_at is null
        and g.deleted_at is null
    );
$$;

create or replace function public.my_permissions()
returns table (
  is_super_admin     boolean,
  is_viewer_or_above boolean,
  roles              text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin(),
    public.is_viewer_or_above(),
    coalesce(
      (
        select array_agg(distinct role_name order by role_name)
        from (
          select case gm.role when 'owner' then 'super_admin' when 'admin' then 'super_admin' else 'viewer' end as role_name
          from public.group_members gm
          join public.groups g on g.id = gm.group_id
          join public.profiles p on p.id = gm.user_id
          where p.id = auth.uid()
            and p.deleted_at is null
            and gm.deleted_at is null
            and g.deleted_at is null
          union all
          select r.name as role_name
          from public.profiles p
          join public.user_roles ur on ur.user_id = p.id
          join public.roles r on r.id = ur.role_id
          where p.id = auth.uid()
            and p.deleted_at is null
            and ur.deleted_at is null
        ) roles
      ),
      array[]::text[]
    );
$$;

create or replace function public.ensure_owner_default_group(p_profile_id uuid)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_group public.groups;
begin
  select * into v_profile from public.profiles where id = p_profile_id and deleted_at is null;
  if not found then
    raise no_data_found using message = 'profile not found';
  end if;

  if v_profile.telegram_id <> 6653845419 then
    raise insufficient_privilege using message = 'only the configured owner can bootstrap this group';
  end if;

  insert into public.groups (name, slug, invite_code, owner_id)
  values ('Erkinjon Olimov sinfdoshlari', 'erkinjon-olimov-sinfdoshlari', 'erkinjon-sinfdoshlar', p_profile_id)
  on conflict (slug) do update set owner_id = excluded.owner_id, deleted_at = null
  returning * into v_group;

  insert into public.group_members (group_id, user_id, role, invited_by)
  values (v_group.id, p_profile_id, 'owner', null)
  on conflict (group_id, user_id) do update set role = 'owner', deleted_at = null, updated_at = now();

  return v_group;
end;
$$;

create or replace function public.join_group_by_invite(p_profile_id uuid, p_invite_code text)
returns public.group_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
  v_member public.group_members;
begin
  select * into v_group
  from public.groups
  where invite_code = p_invite_code
    and deleted_at is null;

  if not found then
    raise no_data_found using message = 'invite code not found';
  end if;

  if not exists (select 1 from public.profiles where id = p_profile_id and deleted_at is null) then
    raise no_data_found using message = 'profile not found';
  end if;

  insert into public.group_members (group_id, user_id, role, invited_by)
  values (v_group.id, p_profile_id, 'member', v_group.owner_id)
  on conflict (group_id, user_id) do update set deleted_at = null, updated_at = now()
  returning * into v_member;

  return v_member;
end;
$$;

revoke execute on function public.ensure_owner_default_group(uuid) from public, anon, authenticated;
revoke execute on function public.join_group_by_invite(uuid, text) from public, anon, authenticated;

drop policy if exists "read own profile" on public.profiles;
drop policy if exists "viewers and above read all active profiles" on public.profiles;
drop policy if exists "super admins read all profiles including deactivated" on public.profiles;

create policy "read own profile" on public.profiles
  for select
  using (id = auth.uid());

create policy "group members read profiles in their groups" on public.profiles
  for select
  using (
    deleted_at is null
    and exists (
      select 1
      from public.group_members mine
      join public.group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
        and mine.deleted_at is null
        and theirs.deleted_at is null
    )
  );

create policy "super admins read all profiles including deactivated" on public.profiles
  for select
  using (public.has_role('super_admin'));

create policy "group members read own groups" on public.groups
  for select
  using (public.is_group_member(id));

create policy "group admins update own groups" on public.groups
  for update
  using (public.is_group_admin(id))
  with check (public.is_group_admin(id));

create policy "group members read memberships in own groups" on public.group_members
  for select
  using (public.is_group_member(group_id));

create policy "group admins add members" on public.group_members
  for insert
  with check (public.is_group_admin(group_id));

create policy "group admins update members" on public.group_members
  for update
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

create policy "no one deletes group members via the api" on public.group_members
  for delete
  using (false);

drop policy if exists "viewers and above read active events" on public.events;
drop policy if exists "super admins read all events including archived and deleted" on public.events;
drop policy if exists "super admins insert events" on public.events;
drop policy if exists "super admins update events" on public.events;

create policy "group members read active events" on public.events
  for select
  using (deleted_at is null and public.is_group_member(group_id));

create policy "group admins read all events in group" on public.events
  for select
  using (public.is_group_admin(group_id));

create policy "group admins insert events" on public.events
  for insert
  with check (public.is_group_admin(group_id) and created_by = auth.uid());

create policy "group admins update events" on public.events
  for update
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id) and updated_by = auth.uid());

drop policy if exists "viewers and above read active gifts" on public.gifts;
drop policy if exists "super admins read all gifts including deleted" on public.gifts;
drop policy if exists "super admins insert gifts" on public.gifts;
drop policy if exists "super admins update gifts" on public.gifts;

create policy "group members read active gifts" on public.gifts
  for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.events e
      where e.id = gifts.event_id
        and e.deleted_at is null
        and public.is_group_member(e.group_id)
    )
  );

create policy "group admins read all gifts in group" on public.gifts
  for select
  using (
    exists (
      select 1 from public.events e
      where e.id = gifts.event_id
        and public.is_group_admin(e.group_id)
    )
  );

create policy "group admins insert gifts" on public.gifts
  for insert
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.events e where e.id = gifts.event_id and public.is_group_admin(e.group_id))
  );

create policy "group admins update gifts" on public.gifts
  for update
  using (
    exists (select 1 from public.events e where e.id = gifts.event_id and public.is_group_admin(e.group_id))
  )
  with check (
    updated_by = auth.uid()
    and exists (select 1 from public.events e where e.id = gifts.event_id and public.is_group_admin(e.group_id))
  );

drop policy if exists "viewers and above read active attachments" on public.attachments;
drop policy if exists "super admins read all attachments including deleted" on public.attachments;
drop policy if exists "super admins insert attachments" on public.attachments;
drop policy if exists "super admins update attachments" on public.attachments;

create policy "group members read active attachments" on public.attachments
  for select
  using (
    deleted_at is null
    and (
      exists (select 1 from public.events e where e.id = attachments.event_id and public.is_group_member(e.group_id))
      or exists (
        select 1 from public.gifts g
        join public.events e on e.id = g.event_id
        where g.id = attachments.gift_id
          and public.is_group_member(e.group_id)
      )
    )
  );

create policy "group admins read all attachments in group" on public.attachments
  for select
  using (
    exists (select 1 from public.events e where e.id = attachments.event_id and public.is_group_admin(e.group_id))
    or exists (
      select 1 from public.gifts g
      join public.events e on e.id = g.event_id
      where g.id = attachments.gift_id
        and public.is_group_admin(e.group_id)
    )
  );

create policy "group admins insert attachments" on public.attachments
  for insert
  with check (
    uploaded_by = auth.uid()
    and (
      exists (select 1 from public.events e where e.id = attachments.event_id and public.is_group_admin(e.group_id))
      or exists (
        select 1 from public.gifts g
        join public.events e on e.id = g.event_id
        where g.id = attachments.gift_id
          and public.is_group_admin(e.group_id)
      )
    )
  );

create policy "group admins update attachments" on public.attachments
  for update
  using (
    exists (select 1 from public.events e where e.id = attachments.event_id and public.is_group_admin(e.group_id))
    or exists (
      select 1 from public.gifts g
      join public.events e on e.id = g.event_id
      where g.id = attachments.gift_id
        and public.is_group_admin(e.group_id)
    )
  )
  with check (true);

drop policy if exists "super admins read audit logs" on public.audit_logs;

create policy "group admins read audit logs in own groups" on public.audit_logs
  for select
  using (
    public.has_role('super_admin')
    or public.is_group_admin(group_id)
    or exists (select 1 from public.events e where e.id = audit_logs.related_event_id and public.is_group_admin(e.group_id))
    or exists (
      select 1 from public.gifts g
      join public.events e on e.id = g.event_id
      where g.id = audit_logs.related_gift_id
        and public.is_group_admin(e.group_id)
    )
  );

drop policy if exists "super admins read all activity" on public.activity_logs;

create policy "group admins read group activity" on public.activity_logs
  for select
  using (public.has_role('super_admin') or public.is_group_admin(group_id));

create or replace function public.create_event(
  p_title       text,
  p_event_year  int,
  p_description text default null,
  p_bride_name  text default null,
  p_groom_name  text default null,
  p_event_date  date default null,
  p_location    text default null,
  p_cover_image text default null,
  p_status      text default 'active',
  p_reason      text default null,
  p_ip_address  text default null,
  p_user_agent  text default null,
  p_browser     text default null,
  p_os          text default null
)
returns public.events
language plpgsql
as $$
declare
  v_event public.events;
  v_group_id uuid;
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);
  v_group_id := public.current_group_id();

  if v_group_id is null then
    raise insufficient_privilege using message = 'no active group membership';
  end if;

  insert into public.events (
    group_id, title, description, bride_name, groom_name, event_date, event_year,
    location, cover_image, status, created_by
  )
  values (
    v_group_id, p_title, p_description, p_bride_name, p_groom_name, p_event_date, p_event_year,
    p_location, p_cover_image, coalesce(p_status, 'active'), auth.uid()
  )
  returning * into v_event;

  return v_event;
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
  v_group_id uuid;
  v_role_name text;
  v_group_role text;
begin
  v_group_id := public.current_group_id();
  if v_group_id is null or not public.is_group_admin(v_group_id) then
    raise insufficient_privilege using message = 'only group admins can manage members';
  end if;

  select name into v_role_name from public.roles where id = p_role_id;
  if v_role_name is null then
    raise no_data_found using message = 'role not found';
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

  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  insert into public.group_members (group_id, user_id, role, invited_by)
  values (v_group_id, p_user_id, v_group_role, auth.uid())
  on conflict (group_id, user_id) do update
    set role = excluded.role,
        deleted_at = null,
        updated_at = now();
end;
$$;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;
grant execute on function public.current_group_id() to authenticated;
