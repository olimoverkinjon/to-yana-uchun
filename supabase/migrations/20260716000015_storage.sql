-- ============================================================================
-- Storage
-- ============================================================================
-- Four buckets, all private (no public bucket): every read goes through a
-- signed URL or an authenticated request that RLS on storage.objects then
-- governs, exactly like every other table in this schema.
--
--   avatars         — profile photos (Telegram already gives us photo_url as
--                      an external URL; this bucket exists for a future
--                      custom-avatar-upload feature, not used yet).
--   covers          — event cover images.
--   attachments     — receipt/photo attachments linked from public.attachments.
--   future-gallery  — reserved for a not-yet-built Photo Gallery feature.
--                      Created now (as asked) but deliberately left with no
--                      access policies at all: default-deny until that
--                      feature actually defines what "gallery" access should
--                      mean, rather than guessing prematurely.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('covers', 'covers', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('attachments', 'attachments', false, 20971520, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('future-gallery', 'future-gallery', false, 20971520, null)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- avatars
-- ----------------------------------------------------------------------------

create policy "viewers and above read avatars" on storage.objects
  for select
  using (bucket_id = 'avatars' and public.is_viewer_or_above());

create policy "super admins upload avatars" on storage.objects
  for insert
  with check (bucket_id = 'avatars' and public.is_super_admin());

create policy "super admins update avatars" on storage.objects
  for update
  using (bucket_id = 'avatars' and public.is_super_admin())
  with check (bucket_id = 'avatars' and public.is_super_admin());

create policy "super admins delete avatars" on storage.objects
  for delete
  using (bucket_id = 'avatars' and public.is_super_admin());


-- ----------------------------------------------------------------------------
-- covers
-- ----------------------------------------------------------------------------

create policy "viewers and above read covers" on storage.objects
  for select
  using (bucket_id = 'covers' and public.is_viewer_or_above());

create policy "super admins upload covers" on storage.objects
  for insert
  with check (bucket_id = 'covers' and public.is_super_admin());

create policy "super admins update covers" on storage.objects
  for update
  using (bucket_id = 'covers' and public.is_super_admin())
  with check (bucket_id = 'covers' and public.is_super_admin());

create policy "super admins delete covers" on storage.objects
  for delete
  using (bucket_id = 'covers' and public.is_super_admin());


-- ----------------------------------------------------------------------------
-- attachments
-- ----------------------------------------------------------------------------

create policy "viewers and above read attachment files" on storage.objects
  for select
  using (bucket_id = 'attachments' and public.is_viewer_or_above());

create policy "super admins upload attachment files" on storage.objects
  for insert
  with check (bucket_id = 'attachments' and public.is_super_admin());

create policy "super admins update attachment files" on storage.objects
  for update
  using (bucket_id = 'attachments' and public.is_super_admin())
  with check (bucket_id = 'attachments' and public.is_super_admin());

create policy "super admins delete attachment files" on storage.objects
  for delete
  using (bucket_id = 'attachments' and public.is_super_admin());

-- future-gallery: bucket created, zero policies — default-deny for every
-- client role until the feature that uses it is actually designed.
