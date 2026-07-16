-- ============================================================================
-- Extensions
-- ============================================================================
-- gen_random_uuid() is built into Postgres core since v13 (Supabase runs 15+),
-- so no extension is needed for UUID generation.
--
-- pg_trgm powers trigram GIN indexes for fuzzy/partial name search
-- (giver_name, event titles, bride/groom names) — the PRD's global search
-- requirement explicitly calls for searching by person name, and exact/prefix
-- matching alone is not good enough for handwritten-notebook-style data entry
-- (typos, partial names, transliteration variants).
-- ============================================================================

create extension if not exists pg_trgm with schema extensions;
