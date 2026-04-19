-- ============================================================
-- ChoreTracker Currency & Store Migration (run after the base migration)
-- Adds per-chore coin rewards and a purchases table for aquarium items.
-- ============================================================

-- Per-chore coin reward
alter table public.chores
  add column if not exists reward integer not null default 5;

-- Purchased aquarium items
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  item_id text not null,
  x integer not null default 50,
  y integer not null default 15,
  created_at timestamptz default now()
);

alter table public.purchases enable row level security;

create policy "Household members can view purchases"
  on public.purchases for select
  using (household_id in (select household_id from public.profiles where id = auth.uid()));

create policy "Household members can create purchases"
  on public.purchases for insert
  with check (household_id in (select household_id from public.profiles where id = auth.uid()));

create policy "Household members can update purchases"
  on public.purchases for update
  using (household_id in (select household_id from public.profiles where id = auth.uid()));

create policy "Household members can delete purchases"
  on public.purchases for delete
  using (household_id in (select household_id from public.profiles where id = auth.uid()));

alter publication supabase_realtime add table public.purchases;
