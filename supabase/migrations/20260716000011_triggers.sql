-- ============================================================================
-- set_updated_at — generic "bump updated_at on every UPDATE"
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.user_roles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.currencies
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.gift_types
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.gifts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.attachments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();


-- ============================================================================
-- audit_row_change — the automatic audit trail
-- ============================================================================
-- Attached to every table whose mutations are meaningful business/security
-- events. Deliberately NOT attached to:
--   * profiles   — last_seen_at updates on every login would flood the log
--                  with routine session noise unrelated to data mutation.
--   * audit_logs / activity_logs — logs do not audit themselves.
--
-- security definer so the INSERT into audit_logs succeeds regardless of the
-- calling role's own RLS restrictions on audit_logs (see that table's RLS
-- policies, which deny direct INSERT to every client role on purpose — this
-- trigger is the *only* path a row can get into audit_logs).
-- ============================================================================

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

    -- Soft-delete/restore are both UPDATEs under the hood; relabel them so
    -- the audit trail reads the way a human (and the PRD) expects.
    if (v_old ->> 'deleted_at') is null and (v_new ->> 'deleted_at') is not null then
      v_action := 'DELETE';
    elsif (v_old ->> 'deleted_at') is not null and (v_new ->> 'deleted_at') is null then
      v_action := 'RESTORE';
    else
      v_action := 'UPDATE';
    end if;
  end if;

  -- Per-request metadata set by set_request_context(); all optional, since
  -- not every write path (e.g. a seed script) will have called it.
  v_reason     := nullif(current_setting('app.change_reason', true), '');
  v_ip_raw     := nullif(current_setting('app.request_ip', true), '');
  v_user_agent := nullif(current_setting('app.user_agent', true), '');
  v_browser    := nullif(current_setting('app.browser', true), '');
  v_os         := nullif(current_setting('app.os', true), '');

  -- A malformed IP string must never abort the underlying business
  -- mutation — this is the one part of audit logging allowed to degrade
  -- gracefully; everything else about this insert is fail-closed.
  begin
    v_ip := v_ip_raw::inet;
  exception when others then
    v_ip := null;
  end;

  select telegram_id into v_telegram_id from public.profiles where id = auth.uid();

  insert into public.audit_logs (
    table_name, record_id, action, old_data, new_data, changed_by, telegram_user_id,
    reason, ip_address, user_agent, browser, os
  ) values (
    TG_TABLE_NAME, v_record_id, v_action, v_old, v_new, auth.uid(), v_telegram_id,
    v_reason, v_ip, v_user_agent, v_browser, v_os
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger audit_row_change after insert or update or delete on public.roles
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.user_roles
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.currencies
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.gift_types
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.events
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.gifts
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.attachments
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.settings
  for each row execute function public.audit_row_change();


-- ============================================================================
-- prevent_audit_log_mutation — immutability, enforced in the database itself
-- ============================================================================
-- Belt-and-braces alongside the RLS policies on audit_logs: this blocks
-- UPDATE/DELETE even for a role that could otherwise bypass RLS entirely
-- (e.g. a superuser connection, or table-owner access from another
-- security definer function). There is no legitimate path that should ever
-- reach this trigger; if it fires, something is trying to tamper with the
-- record.
-- ============================================================================

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs rows are immutable and cannot be updated or deleted';
end;
$$;

create trigger prevent_audit_log_mutation before update or delete on public.audit_logs
  for each row execute function public.prevent_audit_log_mutation();


-- ============================================================================
-- validate_gift_fields — enforce the gift_type's declared required fields
-- ============================================================================
-- A plain CHECK constraint cannot reference another table, so the
-- type-driven schema described in gift_types (requires_amount/currency/
-- weight) is enforced here instead, on every INSERT/UPDATE.
-- ============================================================================

create or replace function public.validate_gift_fields()
returns trigger
language plpgsql
as $$
declare
  v_type public.gift_types;
begin
  select * into v_type from public.gift_types where id = new.gift_type_id;

  if not found then
    raise exception 'gift_type_id % does not exist', new.gift_type_id;
  end if;

  if v_type.requires_amount and new.amount is null then
    raise exception 'gift type "%" requires an amount', v_type.name;
  end if;

  if v_type.requires_currency and new.currency_id is null then
    raise exception 'gift type "%" requires a currency', v_type.name;
  end if;

  if v_type.requires_weight and new.weight is null then
    raise exception 'gift type "%" requires a weight', v_type.name;
  end if;

  return new;
end;
$$;

create trigger validate_gift_fields before insert or update on public.gifts
  for each row execute function public.validate_gift_fields();
