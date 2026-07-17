-- ============================================================================
-- Disabled users must not keep effective permissions.
-- ============================================================================
-- Phase 9 QA found that admin_set_user_disabled() marked profiles.deleted_at
-- but has_role() only checked user_roles.deleted_at. A disabled Viewer or Super
-- Admin could therefore keep reading or mutating data until their role grant was
-- separately revoked. Effective permissions now require an active profile.
-- ============================================================================

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
        select array_agg(r.name order by r.name)
        from public.profiles p
        join public.user_roles ur on ur.user_id = p.id
        join public.roles r on r.id = ur.role_id
        where p.id = auth.uid()
          and p.deleted_at is null
          and ur.deleted_at is null
      ),
      array[]::text[]
    );
$$;
