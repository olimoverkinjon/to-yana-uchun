-- ============================================================================
-- Mutation RPCs
-- ============================================================================
-- Why these exist at all, rather than the app writing to the tables through
-- PostgREST directly:
--
--   set_request_context() stores the request's IP / User-Agent / browser / OS
--   / change-reason as *transaction-local* settings, and PostgREST runs every
--   HTTP request in its own transaction. An app that called
--   `rpc('set_request_context')` and then `.insert()` would be making two
--   separate transactions — the context would already be discarded by the
--   time the audit trigger fired, and every audit row would land with null
--   metadata. Pairing the context with the mutation inside one function is
--   what makes a single round trip a single transaction, so the trigger
--   actually sees it.
--
-- Every function here is SECURITY INVOKER (the default) — deliberately, and
-- this is the important part. The body runs as the calling user, so the RLS
-- policies on events/gifts remain the real enforcement boundary: a Viewer
-- calling create_event() gets an RLS violation from the INSERT itself, not a
-- permission check written in PL/pgSQL that could drift from the policy. The
-- RPC is a transaction wrapper, not a privilege escalation.
--
-- They also pin `created_by`/`updated_by` to auth.uid() rather than trusting
-- a client-supplied value. The RLS policies already require that equality, so
-- a spoofed id would be rejected anyway — setting it here means the client
-- never has to send it, and the two can't disagree.
--
-- update_* functions take every business field as a required argument and
-- perform a full replace (PUT, not PATCH). With optional args, "field
-- omitted" and "field explicitly set to null" are indistinguishable, so
-- clearing a location or a bride's name would be impossible. The forms
-- submit complete objects regardless.
-- ============================================================================

create or replace function public.set_request_context_from_text(
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser    text default null,
  p_os         text default null,
  p_reason     text default null
)
returns void
language plpgsql
as $$
declare
  v_ip inet;
begin
  -- A malformed forwarded-for header must never abort the mutation it was
  -- merely annotating.
  begin
    v_ip := nullif(p_ip_address, '')::inet;
  exception when others then
    v_ip := null;
  end;

  perform public.set_request_context(v_ip, p_user_agent, p_browser, p_os, p_reason);
end;
$$;

comment on function public.set_request_context_from_text is
  'set_request_context() with the IP as text, so callers do not have to hand PostgREST an inet literal and the generated TypeScript stays a plain string.';


-- ----------------------------------------------------------------------------
-- Events
-- ----------------------------------------------------------------------------

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
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  insert into public.events (
    title, description, bride_name, groom_name, event_date, event_year,
    location, cover_image, status, created_by
  )
  values (
    p_title, p_description, p_bride_name, p_groom_name, p_event_date, p_event_year,
    p_location, p_cover_image, coalesce(p_status, 'active'), auth.uid()
  )
  returning * into v_event;

  return v_event;
end;
$$;

create or replace function public.update_event(
  p_id          uuid,
  p_title       text,
  p_event_year  int,
  p_description text,
  p_bride_name  text,
  p_groom_name  text,
  p_event_date  date,
  p_location    text,
  p_cover_image text,
  p_status      text,
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
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  update public.events set
    title       = p_title,
    description = p_description,
    bride_name  = p_bride_name,
    groom_name  = p_groom_name,
    event_date  = p_event_date,
    event_year  = p_event_year,
    location    = p_location,
    cover_image = p_cover_image,
    status      = p_status,
    updated_by  = auth.uid()
  where id = p_id
  returning * into v_event;

  -- Distinguishes "no such event" from "RLS hid it from you" as far as the
  -- caller can tell — deliberately: revealing which of the two it was would
  -- leak the existence of records this user is not allowed to know about.
  if not found then
    raise exception 'event % not found or not permitted', p_id
      using errcode = 'no_data_found';
  end if;

  return v_event;
end;
$$;

create or replace function public.set_event_status(
  p_id         uuid,
  p_status     text,
  p_reason     text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser    text default null,
  p_os         text default null
)
returns public.events
language plpgsql
as $$
declare
  v_event public.events;
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  update public.events set
    status     = p_status,
    updated_by = auth.uid()
  where id = p_id
  returning * into v_event;

  if not found then
    raise exception 'event % not found or not permitted', p_id
      using errcode = 'no_data_found';
  end if;

  return v_event;
end;
$$;

comment on function public.set_event_status is
  'Archive/unarchive. The status CHECK constraint on events is what validates p_status — no second copy of the allowed list to drift out of sync.';

create or replace function public.soft_delete_event(
  p_id         uuid,
  p_reason     text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser    text default null,
  p_os         text default null
)
returns public.events
language plpgsql
as $$
declare
  v_event public.events;
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  update public.events set
    deleted_at = now(),
    updated_by = auth.uid()
  where id = p_id
    and deleted_at is null
  returning * into v_event;

  if not found then
    raise exception 'event % not found, already deleted, or not permitted', p_id
      using errcode = 'no_data_found';
  end if;

  return v_event;
end;
$$;

comment on function public.soft_delete_event is
  'Sets deleted_at. Child gifts are intentionally left untouched — their visibility already derives from the event (see the gift RLS policies), so nothing to cascade and nothing to unwind on restore.';

create or replace function public.restore_event(
  p_id         uuid,
  p_reason     text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser    text default null,
  p_os         text default null
)
returns public.events
language plpgsql
as $$
declare
  v_event public.events;
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  update public.events set
    deleted_at = null,
    updated_by = auth.uid()
  where id = p_id
    and deleted_at is not null
  returning * into v_event;

  if not found then
    raise exception 'event % not found, not deleted, or not permitted', p_id
      using errcode = 'no_data_found';
  end if;

  return v_event;
end;
$$;


-- ----------------------------------------------------------------------------
-- Gifts
-- ----------------------------------------------------------------------------

create or replace function public.create_gift(
  p_event_id     uuid,
  p_giver_name   text,
  p_gift_type_id uuid,
  p_amount       numeric default null,
  p_currency_id  uuid default null,
  p_weight       numeric default null,
  p_unit         text default null,
  p_description  text default null,
  p_gift_date    date default null,
  p_notes        text default null,
  p_reason       text default null,
  p_ip_address   text default null,
  p_user_agent   text default null,
  p_browser      text default null,
  p_os           text default null
)
returns public.gifts
language plpgsql
as $$
declare
  v_gift public.gifts;
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  insert into public.gifts (
    event_id, giver_name, gift_type_id, amount, currency_id, weight, unit,
    description, gift_date, notes, created_by
  )
  values (
    p_event_id, p_giver_name, p_gift_type_id, p_amount, p_currency_id, p_weight, p_unit,
    p_description, coalesce(p_gift_date, current_date), p_notes, auth.uid()
  )
  returning * into v_gift;

  return v_gift;
end;
$$;

comment on function public.create_gift is
  'Whether amount/currency/weight are actually required for the chosen gift type is enforced by the validate_gift_fields trigger, which reads gift_types.requires_* — the rule lives in one place and applies to every write path, not just this one.';

create or replace function public.update_gift(
  p_id           uuid,
  p_giver_name   text,
  p_gift_type_id uuid,
  p_amount       numeric,
  p_currency_id  uuid,
  p_weight       numeric,
  p_unit         text,
  p_description  text,
  p_gift_date    date,
  p_notes        text,
  p_reason       text default null,
  p_ip_address   text default null,
  p_user_agent   text default null,
  p_browser      text default null,
  p_os           text default null
)
returns public.gifts
language plpgsql
as $$
declare
  v_gift public.gifts;
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  -- event_id is absent on purpose: moving a gift to a different wedding is
  -- not an edit, it is a different record. Allowing it here would silently
  -- rewrite history on two events at once.
  update public.gifts set
    giver_name   = p_giver_name,
    gift_type_id = p_gift_type_id,
    amount       = p_amount,
    currency_id  = p_currency_id,
    weight       = p_weight,
    unit         = p_unit,
    description  = p_description,
    gift_date    = p_gift_date,
    notes        = p_notes,
    updated_by   = auth.uid()
  where id = p_id
  returning * into v_gift;

  if not found then
    raise exception 'gift % not found or not permitted', p_id
      using errcode = 'no_data_found';
  end if;

  return v_gift;
end;
$$;

create or replace function public.soft_delete_gift(
  p_id         uuid,
  p_reason     text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser    text default null,
  p_os         text default null
)
returns public.gifts
language plpgsql
as $$
declare
  v_gift public.gifts;
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  update public.gifts set
    deleted_at = now(),
    updated_by = auth.uid()
  where id = p_id
    and deleted_at is null
  returning * into v_gift;

  if not found then
    raise exception 'gift % not found, already deleted, or not permitted', p_id
      using errcode = 'no_data_found';
  end if;

  return v_gift;
end;
$$;

create or replace function public.restore_gift(
  p_id         uuid,
  p_reason     text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_browser    text default null,
  p_os         text default null
)
returns public.gifts
language plpgsql
as $$
declare
  v_gift public.gifts;
begin
  perform public.set_request_context_from_text(p_ip_address, p_user_agent, p_browser, p_os, p_reason);

  update public.gifts set
    deleted_at = null,
    updated_by = auth.uid()
  where id = p_id
    and deleted_at is not null
  returning * into v_gift;

  if not found then
    raise exception 'gift % not found, not deleted, or not permitted', p_id
      using errcode = 'no_data_found';
  end if;

  return v_gift;
end;
$$;


-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
-- Granted to `authenticated` broadly — a Viewer may *call* create_event(),
-- and will simply hit the RLS policy inside it and be rejected. That is the
-- intended design: one enforcement point (RLS), not two.

grant execute on function public.set_request_context_from_text(text, text, text, text, text) to authenticated;

grant execute on function public.create_event(text, int, text, text, text, date, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.update_event(uuid, text, int, text, text, text, date, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.set_event_status(uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.soft_delete_event(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.restore_event(uuid, text, text, text, text, text) to authenticated;

grant execute on function public.create_gift(uuid, text, uuid, numeric, uuid, numeric, text, text, date, text, text, text, text, text, text) to authenticated;
grant execute on function public.update_gift(uuid, text, uuid, numeric, uuid, numeric, text, text, date, text, text, text, text, text, text) to authenticated;
grant execute on function public.soft_delete_gift(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.restore_gift(uuid, text, text, text, text, text) to authenticated;
