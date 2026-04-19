-- ============================================================
-- ChoreTracker Snooze Migration (run after migration 02)
-- Adds a snoozed_until date column to chores.
-- ============================================================

alter table public.chores
  add column if not exists snoozed_until date;
