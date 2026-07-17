-- ============================================================================
-- Text length guards at the database boundary.
-- ============================================================================
-- Forms already validate user-facing lengths, but RLS/RPC/database constraints
-- are the enforcement boundary. These checks prevent direct RPC calls or future
-- UI regressions from storing pathological payloads that hurt search, exports,
-- audit diffs, and mobile rendering.
-- ============================================================================

alter table public.events
  add constraint events_title_length_check check (char_length(title) between 1 and 200),
  add constraint events_people_length_check check (
    char_length(coalesce(bride_name, '')) <= 200
    and char_length(coalesce(groom_name, '')) <= 200
  ),
  add constraint events_description_length_check check (char_length(coalesce(description, '')) <= 5000),
  add constraint events_location_length_check check (char_length(coalesce(location, '')) <= 300),
  add constraint events_cover_image_length_check check (char_length(coalesce(cover_image, '')) <= 1000);

alter table public.gifts
  add constraint gifts_giver_name_length_check check (char_length(giver_name) between 1 and 200),
  add constraint gifts_unit_length_check check (char_length(coalesce(unit, '')) <= 50),
  add constraint gifts_description_length_check check (char_length(coalesce(description, '')) <= 5000),
  add constraint gifts_notes_length_check check (char_length(coalesce(notes, '')) <= 5000);

alter table public.attachments
  add constraint attachments_file_name_length_check check (char_length(file_name) between 1 and 255),
  add constraint attachments_storage_path_length_check check (char_length(storage_path) between 1 and 1000),
  add constraint attachments_mime_type_length_check check (char_length(coalesce(mime_type, '')) <= 255);
