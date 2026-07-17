-- ============================================================================
-- Phase 6 enterprise audit system
-- ============================================================================
-- Adds richer immutable audit metadata, record links, version restore RPCs,
-- server-side audit statistics, system logs, and admin notifications.
-- ============================================================================

alter table public.audit_logs
  add column if not exists changed_fields jsonb not null default '{}'::jsonb,
  add column if not exists actor_role text,
  add column if not exists device text,
  add column if not exists session_id text,
  add column if not exists request_id text,
  add column if not exists related_event_id uuid,
  add column if not exists related_gift_id uuid,
  add column if not exists severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical'));

alter table public.audit_logs drop constraint if exists audit_logs_related_event_id_fkey;
alter table public.audit_logs drop constraint if exists audit_logs_related_gift_id_fkey;

create index if not exists audit_logs_created_id_idx on public.audit_logs (created_at desc, id desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (changed_by, created_at desc);
create index if not exists audit_logs_table_record_idx on public.audit_logs (table_name, record_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);
create index if not exists audit_logs_related_event_idx on public.audit_logs (related_event_id, created_at desc);
create index if not exists audit_logs_related_gift_idx on public.audit_logs (related_gift_id, created_at desc);
create index if not exists audit_logs_changed_fields_idx on public.audit_logs using gin (changed_fields);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  level text not null default 'info' check (level in ('info', 'warning', 'error', 'critical')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists system_logs_created_idx on public.system_logs (created_at desc);
alter table public.system_logs enable row level security;
grant select on public.system_logs to authenticated;
create policy "super admins read system logs" on public.system_logs
  for select using (public.is_super_admin());

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  audit_log_id uuid references public.audit_logs(id),
  title text not null,
  body text,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  read_at timestamptz
);

create index if not exists admin_notifications_created_idx on public.admin_notifications (created_at desc);
create index if not exists admin_notifications_unread_idx on public.admin_notifications (created_at desc) where read_at is null;
alter table public.admin_notifications enable row level security;
grant select, update on public.admin_notifications to authenticated;
create policy "super admins read notifications" on public.admin_notifications
  for select using (public.is_super_admin());
create policy "super admins mark notifications read" on public.admin_notifications
  for update using (public.is_super_admin()) with check (public.is_super_admin());

create or replace function public.audit_changed_fields(p_old jsonb, p_new jsonb)
returns jsonb
language sql
stable
as $$
  select coalesce(
    jsonb_object_agg(key, jsonb_build_object('old', old_value, 'new', new_value) order by key),
    '{}'::jsonb
  )
  from (
    select
      key,
      p_old -> key as old_value,
      p_new -> key as new_value
    from (
      select jsonb_object_keys(coalesce(p_old, '{}'::jsonb) || coalesce(p_new, '{}'::jsonb)) as key
    ) keys
    where key not in ('search_vector')
      and (p_old -> key) is distinct from (p_new -> key)
  ) diff;
$$;

create or replace function public.audit_related_event_id(p_table text, p_old jsonb, p_new jsonb, p_record_id uuid)
returns uuid
language sql
stable
as $$
  select case
    when p_table = 'events' then p_record_id
    when p_table = 'gifts' then nullif(coalesce(p_new ->> 'event_id', p_old ->> 'event_id'), '')::uuid
    when p_table = 'attachments' then nullif(coalesce(p_new ->> 'event_id', p_old ->> 'event_id'), '')::uuid
    else null
  end;
$$;

create or replace function public.audit_related_gift_id(p_table text, p_old jsonb, p_new jsonb, p_record_id uuid)
returns uuid
language sql
stable
as $$
  select case
    when p_table = 'gifts' then p_record_id
    when p_table = 'attachments' then nullif(coalesce(p_new ->> 'gift_id', p_old ->> 'gift_id'), '')::uuid
    else null
  end;
$$;

create or replace function public.audit_severity(p_table text, p_action text)
returns text
language sql
stable
as $$
  select case
    when p_table in ('user_roles', 'settings') and p_action in ('INSERT', 'UPDATE', 'DELETE', 'RESTORE') then 'critical'
    when p_action in ('DELETE', 'RESTORE') then 'warning'
    else 'info'
  end;
$$;

create or replace function public.audit_device_from_user_agent(p_user_agent text)
returns text
language sql
stable
as $$
  select case
    when p_user_agent is null then null
    when p_user_agent ~* 'Mobile|Android|iPhone|iPad|Telegram' then 'mobile'
    else 'desktop'
  end;
$$;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action      text;
  v_record_id   uuid;
  v_old         jsonb;
  v_new         jsonb;
  v_reason      text;
  v_ip_raw      text;
  v_ip          inet;
  v_user_agent  text;
  v_browser     text;
  v_os          text;
  v_telegram_id bigint;
  v_role_name   text;
  v_changed     jsonb;
  v_event_id    uuid;
  v_gift_id     uuid;
  v_severity    text;
  v_audit_id    uuid;
begin
  if TG_OP = 'INSERT' then
    v_action    := 'INSERT';
    v_record_id := NEW.id;
    v_new       := to_jsonb(NEW);

  elsif TG_OP = 'DELETE' then
    v_action    := 'DELETE';
    v_record_id := OLD.id;
    v_old       := to_jsonb(OLD);

  elsif TG_OP = 'UPDATE' then
    v_record_id := NEW.id;
    v_old       := to_jsonb(OLD);
    v_new       := to_jsonb(NEW);

    if (v_old ->> 'deleted_at') is null and (v_new ->> 'deleted_at') is not null then
      v_action := 'DELETE';
    elsif (v_old ->> 'deleted_at') is not null and (v_new ->> 'deleted_at') is null then
      v_action := 'RESTORE';
    else
      v_action := 'UPDATE';
    end if;
  end if;

  v_reason     := nullif(current_setting('app.change_reason', true), '');
  v_ip_raw     := nullif(current_setting('app.request_ip', true), '');
  v_user_agent := nullif(current_setting('app.user_agent', true), '');
  v_browser    := nullif(current_setting('app.browser', true), '');
  v_os         := nullif(current_setting('app.os', true), '');

  begin
    v_ip := v_ip_raw::inet;
  exception when others then
    v_ip := null;
  end;

  select p.telegram_id, r.name
    into v_telegram_id, v_role_name
  from public.profiles p
  left join public.user_roles ur on ur.user_id = p.id and ur.deleted_at is null
  left join public.roles r on r.id = ur.role_id
  where p.id = auth.uid()
  order by case r.name when 'super_admin' then 0 else 1 end
  limit 1;

  v_changed := public.audit_changed_fields(v_old, v_new);
  v_event_id := public.audit_related_event_id(TG_TABLE_NAME, v_old, v_new, v_record_id);
  v_gift_id := public.audit_related_gift_id(TG_TABLE_NAME, v_old, v_new, v_record_id);
  v_severity := public.audit_severity(TG_TABLE_NAME, v_action);

  insert into public.audit_logs (
    table_name, record_id, action, old_data, new_data, changed_by, telegram_user_id,
    actor_role, changed_fields, reason, ip_address, user_agent, browser, os, device,
    session_id, request_id, related_event_id, related_gift_id, severity
  ) values (
    TG_TABLE_NAME, v_record_id, v_action, v_old, v_new, auth.uid(), v_telegram_id,
    v_role_name, v_changed, v_reason, v_ip, v_user_agent, v_browser, v_os,
    public.audit_device_from_user_agent(v_user_agent),
    nullif(current_setting('app.session_id', true), ''),
    coalesce(nullif(current_setting('app.request_id', true), ''), gen_random_uuid()::text),
    v_event_id, v_gift_id, v_severity
  )
  returning id into v_audit_id;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

create or replace function public.create_admin_notification_from_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.severity in ('warning', 'critical') then
    insert into public.admin_notifications (audit_log_id, title, body, severity)
    values (
      NEW.id,
      NEW.action || ' on ' || NEW.table_name,
      coalesce(NEW.reason, 'No reason provided'),
      NEW.severity
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists create_admin_notification_from_audit on public.audit_logs;
create trigger create_admin_notification_from_audit
after insert on public.audit_logs
for each row execute function public.create_admin_notification_from_audit();

create or replace view public.enterprise_audit_logs
with (security_invoker = true)
as
select
  al.*,
  p.first_name as actor_first_name,
  p.last_name as actor_last_name,
  p.username as actor_username,
  e.title as event_title,
  g.giver_name as gift_giver_name
from public.audit_logs al
left join public.profiles p on p.id = al.changed_by
left join public.events e on e.id = al.related_event_id
left join public.gifts g on g.id = al.related_gift_id
order by al.created_at desc, al.id desc;

grant select on public.enterprise_audit_logs to authenticated;

drop view if exists public.recent_activity;
create view public.recent_activity
with (security_invoker = true)
as
select
  al.id,
  al.table_name,
  al.record_id,
  al.action,
  al.reason,
  al.created_at,
  al.changed_by,
  al.related_event_id,
  al.related_gift_id,
  al.changed_fields,
  al.severity,
  p.first_name as changed_by_first_name,
  p.last_name  as changed_by_last_name,
  p.username   as changed_by_username
from public.audit_logs al
left join public.profiles p on p.id = al.changed_by
order by al.created_at desc, al.id desc;

grant select on public.recent_activity to authenticated;

create or replace function public.audit_statistics()
returns table (
  most_active_admin jsonb,
  most_edited_event jsonb,
  most_edited_gift jsonb,
  most_active_day jsonb,
  most_common_action jsonb
)
language sql
stable
security invoker
as $$
  select
    (
      select jsonb_build_object(
        'user_id', al.changed_by,
        'name', trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
        'username', p.username,
        'count', count(*)
      )
      from public.audit_logs al
      left join public.profiles p on p.id = al.changed_by
      where al.changed_by is not null
      group by al.changed_by, p.first_name, p.last_name, p.username
      order by count(*) desc
      limit 1
    ),
    (
      select jsonb_build_object('event_id', al.related_event_id, 'title', e.title, 'count', count(*))
      from public.audit_logs al
      left join public.events e on e.id = al.related_event_id
      where al.related_event_id is not null and al.action = 'UPDATE'
      group by al.related_event_id, e.title
      order by count(*) desc
      limit 1
    ),
    (
      select jsonb_build_object('gift_id', al.related_gift_id, 'giver_name', g.giver_name, 'count', count(*))
      from public.audit_logs al
      left join public.gifts g on g.id = al.related_gift_id
      where al.related_gift_id is not null and al.action = 'UPDATE'
      group by al.related_gift_id, g.giver_name
      order by count(*) desc
      limit 1
    ),
    (
      select jsonb_build_object('day', date_trunc('day', al.created_at)::date, 'count', count(*))
      from public.audit_logs al
      group by date_trunc('day', al.created_at)::date
      order by count(*) desc
      limit 1
    ),
    (
      select jsonb_build_object('action', al.action, 'count', count(*))
      from public.audit_logs al
      group by al.action
      order by count(*) desc
      limit 1
    );
$$;

grant execute on function public.audit_statistics() to authenticated;

create or replace function public.restore_event_version(
  p_audit_id uuid,
  p_reason text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser text default null,
  p_os text default null
)
returns public.events
language plpgsql
as $$
declare
  v_audit public.audit_logs;
  v_data jsonb;
  v_event public.events;
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, coalesce(p_reason, 'Restore historical event version'));

  select * into v_audit from public.audit_logs where id = p_audit_id and table_name = 'events';
  if not found then
    raise no_data_found using message = 'event audit version not found';
  end if;

  v_data := coalesce(v_audit.old_data, v_audit.new_data);
  if v_data is null then
    raise no_data_found using message = 'event audit version has no data';
  end if;

  update public.events set
    title = v_data ->> 'title',
    description = v_data ->> 'description',
    bride_name = v_data ->> 'bride_name',
    groom_name = v_data ->> 'groom_name',
    event_date = nullif(v_data ->> 'event_date', '')::date,
    event_year = (v_data ->> 'event_year')::int,
    location = v_data ->> 'location',
    cover_image = v_data ->> 'cover_image',
    status = coalesce(v_data ->> 'status', 'active'),
    deleted_at = nullif(v_data ->> 'deleted_at', '')::timestamptz,
    updated_by = auth.uid()
  where id = (v_data ->> 'id')::uuid
  returning * into v_event;

  if not found then
    raise no_data_found using message = 'event not found or not permitted';
  end if;

  return v_event;
end;
$$;

create or replace function public.restore_gift_version(
  p_audit_id uuid,
  p_reason text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser text default null,
  p_os text default null
)
returns public.gifts
language plpgsql
as $$
declare
  v_audit public.audit_logs;
  v_data jsonb;
  v_gift public.gifts;
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, coalesce(p_reason, 'Restore historical gift version'));

  select * into v_audit from public.audit_logs where id = p_audit_id and table_name = 'gifts';
  if not found then
    raise no_data_found using message = 'gift audit version not found';
  end if;

  v_data := coalesce(v_audit.old_data, v_audit.new_data);
  if v_data is null then
    raise no_data_found using message = 'gift audit version has no data';
  end if;

  update public.gifts set
    giver_name = v_data ->> 'giver_name',
    gift_type_id = (v_data ->> 'gift_type_id')::uuid,
    amount = nullif(v_data ->> 'amount', '')::numeric,
    currency_id = nullif(v_data ->> 'currency_id', '')::uuid,
    weight = nullif(v_data ->> 'weight', '')::numeric,
    unit = v_data ->> 'unit',
    description = v_data ->> 'description',
    gift_date = nullif(v_data ->> 'gift_date', '')::date,
    notes = v_data ->> 'notes',
    deleted_at = nullif(v_data ->> 'deleted_at', '')::timestamptz,
    updated_by = auth.uid()
  where id = (v_data ->> 'id')::uuid
  returning * into v_gift;

  if not found then
    raise no_data_found using message = 'gift not found or not permitted';
  end if;

  return v_gift;
end;
$$;

grant execute on function public.restore_event_version(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.restore_gift_version(uuid, text, text, text, text, text) to authenticated;

insert into public.system_logs (source, level, message, metadata)
values ('migration', 'info', 'Enterprise audit system installed', jsonb_build_object('phase', 6))
on conflict do nothing;
