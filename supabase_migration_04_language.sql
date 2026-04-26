-- ============================================================
-- ChoreTracker Language Migration (run after migration 03)
-- Adds a per-user language preference (e.g. 'en', 'vi').
-- Null means the user hasn't picked one yet — used to trigger
-- the first-time language picker after sign-in.
-- ============================================================

alter table public.profiles
  add column if not exists language text;
