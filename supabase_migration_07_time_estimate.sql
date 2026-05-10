-- ============================================================
-- Migration 07: Per-chore time estimate
-- ============================================================
-- Stores how long a chore is expected to take, in minutes. The UI
-- uses this to render a "today: ~30 min" aggregate and a per-row
-- time pill so users can plan around shorter / longer chores.
-- NULL means "no estimate" — those chores are excluded from totals.
-- ============================================================

alter table public.chores
  add column if not exists estimated_minutes smallint;

alter table public.chores
  add constraint chores_estimated_minutes_range
    check (estimated_minutes is null or (estimated_minutes between 1 and 600));
