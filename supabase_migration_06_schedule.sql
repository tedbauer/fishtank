-- ============================================================
-- Migration 06: Editable per-chore schedule
-- ============================================================
-- Adds columns so a recurring chore can be pinned to a specific day
-- of the week / week parity / day of the month, instead of inferring
-- the cadence anchor purely from `created_at`. Defaults are derived
-- in the client when these columns are NULL, so existing rows keep
-- working without backfill.
--
--   schedule_dow          0..6 (Sunday..Saturday) — used by weekly
--                         and biweekly chores. NULL → derive from
--                         created_at.
--   schedule_week_parity  0 or 1 — biweekly only. Picks which "every
--                         other" week the chore lands on. NULL →
--                         derive from created_at.
--   schedule_dom          1..31 — monthly only. Day of month. NULL
--                         → derive from created_at. Days past the
--                         end of a short month clamp to the last
--                         day of that month at evaluation time.
-- ============================================================

alter table public.chores
  add column if not exists schedule_dow smallint,
  add column if not exists schedule_week_parity smallint,
  add column if not exists schedule_dom smallint;

alter table public.chores
  add constraint chores_schedule_dow_range
    check (schedule_dow is null or (schedule_dow between 0 and 6));

alter table public.chores
  add constraint chores_schedule_week_parity_range
    check (schedule_week_parity is null or schedule_week_parity in (0, 1));

alter table public.chores
  add constraint chores_schedule_dom_range
    check (schedule_dom is null or (schedule_dom between 1 and 31));
