-- ============================================================================
-- Owner lock + private user gift notes
-- ============================================================================
-- The shared wedding ledger is admin-managed and public to viewers. Ordinary
-- users also need a private notebook for "I gave $100 to Erkinjon's wedding";
-- those notes must never be visible to other viewers. This table is therefore
-- separate from public.gifts and scoped by user_id = auth.uid().

do $$
declare
  v_super_admin_role_id uuid;
begin
  select id into v_super_admin_role_id
  from public.roles
  where name = 'super_admin';

  if v_super_admin_role_id is not null then
    update public.user_roles ur
    set deleted_at = coalesce(ur.deleted_at, now()),
        updated_at = now()
    from public.profiles p
    where ur.user_id = p.id
      and ur.role_id = v_super_admin_role_id
      and ur.deleted_at is null
      and p.telegram_id <> 6653845419;
  end if;
end;
$$;

create table public.personal_gifts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  event_title  text not null,
  recipient_name text,
  amount       numeric,
  currency_id  uuid references public.currencies (id) on delete restrict,
  description  text,
  gift_date    date not null default current_date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint personal_gifts_event_title_length_check check (char_length(event_title) between 1 and 200),
  constraint personal_gifts_recipient_name_length_check check (char_length(coalesce(recipient_name, '')) <= 200),
  constraint personal_gifts_description_length_check check (char_length(coalesce(description, '')) <= 5000),
  constraint personal_gifts_notes_length_check check (char_length(coalesce(notes, '')) <= 5000),
  constraint personal_gifts_amount_nonnegative_check check (amount is null or amount >= 0),
  constraint personal_gifts_amount_currency_check check (
    (amount is null and currency_id is null)
    or (amount is not null and currency_id is not null)
  ),
  constraint personal_gifts_has_value_check check (
    amount is not null
    or nullif(btrim(coalesce(description, '')), '') is not null
  )
);

comment on table public.personal_gifts is
  'Private per-user notebook of gifts the current Telegram user says they gave to other weddings. Not part of the shared admin ledger.';

create trigger set_updated_at before update on public.personal_gifts
  for each row execute function public.set_updated_at();

create index personal_gifts_user_date_idx on public.personal_gifts (user_id, gift_date desc, created_at desc)
  where deleted_at is null;
create index personal_gifts_currency_id_idx on public.personal_gifts (currency_id)
  where deleted_at is null;
create index personal_gifts_deleted_at_idx on public.personal_gifts (deleted_at)
  where deleted_at is not null;
create index personal_gifts_search_trgm_idx on public.personal_gifts using gin (
  (event_title || ' ' || coalesce(recipient_name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(notes, '')) extensions.gin_trgm_ops
);

alter table public.personal_gifts enable row level security;
grant select, insert, update, delete on public.personal_gifts to authenticated;

create policy "users read own personal gifts" on public.personal_gifts
  for select
  using (user_id = auth.uid());

create policy "users insert own personal gifts" on public.personal_gifts
  for insert
  with check (user_id = auth.uid());

create policy "users update own personal gifts" on public.personal_gifts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "no one hard-deletes personal gifts via the api" on public.personal_gifts
  for delete
  using (false);
