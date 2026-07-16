-- ============================================================================
-- my_permissions — what the current caller is allowed to do
-- ============================================================================
-- The UI has to know whether to render an "Add Gift" button, and the server
-- actions have to fail fast before bothering the database with a write that
-- RLS will reject anyway. Both need the same answer.
--
-- Rather than reimplementing the rule ("a super_admin is someone with a row
-- in user_roles joined to roles where name = 'super_admin' and deleted_at is
-- null") in TypeScript, this returns the result of the very same
-- is_super_admin() / is_viewer_or_above() functions that every RLS policy
-- calls. The frontend and the enforcement boundary cannot drift apart,
-- because they are reading the same function.
--
-- security definer, because a caller with no roles at all still needs a
-- truthful answer (all false) — and such a user cannot read public.roles by
-- policy, so an invoker-rights version would error instead of returning
-- false.
-- ============================================================================

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
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = auth.uid()
          and ur.deleted_at is null
      ),
      array[]::text[]
    );
$$;

comment on function public.my_permissions is
  'The current caller''s effective permissions, derived from the same functions the RLS policies use so the two can never disagree.';

grant execute on function public.my_permissions() to authenticated;
