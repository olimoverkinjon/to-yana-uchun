-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Two roles, enforced here and only here: Viewer (read-only, non-deleted
-- rows) and Super Admin (full CRUD, including soft-deleted rows so they can
-- restore them). The frontend never decides who can do what — every policy
-- below is the actual, only enforcement boundary. A leaked anon key or a
-- direct Realtime subscription can do no more than these policies allow.
--
-- SQL-level GRANTs are also required alongside RLS: Supabase's current
-- default does not auto-expose new tables to `anon`/`authenticated` (see
-- `auto_expose_new_tables` in supabase/config.toml), so each table gets an
-- explicit GRANT here, with RLS policies doing the actual row-level
-- narrowing. Nothing is granted to `anon` — every caller must be a verified
-- Telegram user holding a minted `authenticated`-role JWT, even before they
-- have any role granted in user_roles.
--
-- Every table's DELETE policy denies the operation outright (`using
-- (false)`): this app only ever soft-deletes via UPDATE. A real hard DELETE
-- is a deliberate operational action (e.g. GDPR erasure) performed with the
-- service_role key outside the app's normal RLS-governed path, never
-- through the API.
-- ============================================================================

grant usage on schema public to authenticated;
revoke all on schema public from anon;


-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
-- No INSERT/UPDATE/DELETE policy exists for `authenticated` at all: profiles
-- are written exclusively by upsert_telegram_profile() via the service-role
-- client, during the auth handshake, before any user session/JWT exists.
-- A user can always see their own row (even with zero roles granted, so the
-- app can render a "waiting for access" state); anyone with a granted role
-- can see everyone's profile, since attribution displays ("Rustam aka added
-- a gift") need to resolve other users' names.

alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;

create policy "read own profile" on public.profiles
  for select
  using (id = auth.uid());

create policy "viewers and above read all active profiles" on public.profiles
  for select
  using (deleted_at is null and public.is_viewer_or_above());

create policy "super admins read all profiles including deactivated" on public.profiles
  for select
  using (public.is_super_admin());


-- ----------------------------------------------------------------------------
-- roles
-- ----------------------------------------------------------------------------

alter table public.roles enable row level security;
grant select, insert, update, delete on public.roles to authenticated;

create policy "viewers and above read roles" on public.roles
  for select
  using (public.is_viewer_or_above());

create policy "super admins manage roles" on public.roles
  for insert
  with check (public.is_super_admin());

create policy "super admins update roles" on public.roles
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "no one deletes roles via the api" on public.roles
  for delete
  using (false);


-- ----------------------------------------------------------------------------
-- user_roles
-- ----------------------------------------------------------------------------
-- A user can see their own grants (so the client can determine "what can I
-- do"); only a Super Admin can see everyone's, and only a Super Admin can
-- grant or revoke. There is no "authenticated can insert their own viewer
-- role" escape hatch — self-service role assignment defeats the entire
-- invite-only access model this schema was designed around.

alter table public.user_roles enable row level security;
grant select, insert, update, delete on public.user_roles to authenticated;

create policy "read own role grants" on public.user_roles
  for select
  using (user_id = auth.uid());

create policy "super admins read all role grants" on public.user_roles
  for select
  using (public.is_super_admin());

create policy "super admins grant roles" on public.user_roles
  for insert
  with check (public.is_super_admin());

create policy "super admins revoke roles" on public.user_roles
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "no one deletes role grants via the api" on public.user_roles
  for delete
  using (false);


-- ----------------------------------------------------------------------------
-- currencies
-- ----------------------------------------------------------------------------

alter table public.currencies enable row level security;
grant select, insert, update, delete on public.currencies to authenticated;

create policy "viewers and above read active currencies" on public.currencies
  for select
  using (deleted_at is null and public.is_viewer_or_above());

create policy "super admins read all currencies" on public.currencies
  for select
  using (public.is_super_admin());

create policy "super admins insert currencies" on public.currencies
  for insert
  with check (public.is_super_admin());

create policy "super admins update currencies" on public.currencies
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "no one deletes currencies via the api" on public.currencies
  for delete
  using (false);


-- ----------------------------------------------------------------------------
-- gift_types
-- ----------------------------------------------------------------------------

alter table public.gift_types enable row level security;
grant select, insert, update, delete on public.gift_types to authenticated;

create policy "viewers and above read active gift types" on public.gift_types
  for select
  using (deleted_at is null and public.is_viewer_or_above());

create policy "super admins read all gift types" on public.gift_types
  for select
  using (public.is_super_admin());

create policy "super admins insert gift types" on public.gift_types
  for insert
  with check (public.is_super_admin() and (created_by is null or created_by = auth.uid()));

create policy "super admins update gift types" on public.gift_types
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "no one deletes gift types via the api" on public.gift_types
  for delete
  using (false);


-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------

alter table public.events enable row level security;
grant select, insert, update, delete on public.events to authenticated;

create policy "viewers and above read active events" on public.events
  for select
  using (deleted_at is null and public.is_viewer_or_above());

create policy "super admins read all events including archived and deleted" on public.events
  for select
  using (public.is_super_admin());

create policy "super admins insert events" on public.events
  for insert
  with check (public.is_super_admin() and created_by = auth.uid());

create policy "super admins update events" on public.events
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin() and updated_by = auth.uid());

create policy "no one deletes events via the api" on public.events
  for delete
  using (false);


-- ----------------------------------------------------------------------------
-- gifts
-- ----------------------------------------------------------------------------

alter table public.gifts enable row level security;
grant select, insert, update, delete on public.gifts to authenticated;

create policy "viewers and above read active gifts" on public.gifts
  for select
  using (deleted_at is null and public.is_viewer_or_above());

create policy "super admins read all gifts including deleted" on public.gifts
  for select
  using (public.is_super_admin());

create policy "super admins insert gifts" on public.gifts
  for insert
  with check (public.is_super_admin() and created_by = auth.uid());

create policy "super admins update gifts" on public.gifts
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin() and updated_by = auth.uid());

create policy "no one deletes gifts via the api" on public.gifts
  for delete
  using (false);


-- ----------------------------------------------------------------------------
-- attachments
-- ----------------------------------------------------------------------------

alter table public.attachments enable row level security;
grant select, insert, update, delete on public.attachments to authenticated;

create policy "viewers and above read active attachments" on public.attachments
  for select
  using (deleted_at is null and public.is_viewer_or_above());

create policy "super admins read all attachments including deleted" on public.attachments
  for select
  using (public.is_super_admin());

create policy "super admins insert attachments" on public.attachments
  for insert
  with check (public.is_super_admin() and uploaded_by = auth.uid());

create policy "super admins update attachments" on public.attachments
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "no one deletes attachments via the api" on public.attachments
  for delete
  using (false);


-- ----------------------------------------------------------------------------
-- audit_logs
-- ----------------------------------------------------------------------------
-- Readable only by Super Admins (matches the PRD's permission matrix: "View
-- activity/audit logs" is Super-Admin-only). INSERT is denied to every
-- client role outright — the only row-creating path is audit_row_change(),
-- a security definer trigger function that runs with the table owner's
-- privileges and therefore bypasses this policy entirely (see the triggers
-- migration for why that is safe and intentional). UPDATE/DELETE are denied
-- to everyone, full stop, on top of the hard trigger-level block.

alter table public.audit_logs enable row level security;
grant select on public.audit_logs to authenticated;

create policy "super admins read audit logs" on public.audit_logs
  for select
  using (public.is_super_admin());

create policy "no direct inserts into audit logs" on public.audit_logs
  for insert
  with check (false);

create policy "no one updates audit logs" on public.audit_logs
  for update
  using (false);

create policy "no one deletes audit logs" on public.audit_logs
  for delete
  using (false);


-- ----------------------------------------------------------------------------
-- activity_logs
-- ----------------------------------------------------------------------------
-- Any authenticated user can log their own activity (search, view, login,
-- theme/language change); a user can also see their own history, while a
-- Super Admin can see everyone's. Unlike audit_logs, DELETE is not
-- categorically denied — this is prunable telemetry, not a permanent trust
-- record — but it is still restricted to Super Admin (or, in practice, a
-- retention job running as service_role).

alter table public.activity_logs enable row level security;
grant select, insert, delete on public.activity_logs to authenticated;

create policy "read own activity" on public.activity_logs
  for select
  using (user_id = auth.uid());

create policy "super admins read all activity" on public.activity_logs
  for select
  using (public.is_super_admin());

create policy "log own activity" on public.activity_logs
  for insert
  with check (user_id = auth.uid());

create policy "super admins prune activity logs" on public.activity_logs
  for delete
  using (public.is_super_admin());


-- ----------------------------------------------------------------------------
-- settings
-- ----------------------------------------------------------------------------

alter table public.settings enable row level security;
grant select, insert, update on public.settings to authenticated;

create policy "viewers and above read settings" on public.settings
  for select
  using (public.is_viewer_or_above());

create policy "super admins insert settings" on public.settings
  for insert
  with check (public.is_super_admin());

create policy "super admins update settings" on public.settings
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());


-- ----------------------------------------------------------------------------
-- Views and helper functions
-- ----------------------------------------------------------------------------

grant select on public.event_cash_totals to authenticated;
grant select on public.event_gift_type_totals to authenticated;
grant select on public.dashboard_stats to authenticated;
grant select on public.recent_activity to authenticated;

grant execute on function public.has_role(text) to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_viewer_or_above() to authenticated;
grant execute on function public.set_request_context(inet, text, text, text, text) to authenticated;
