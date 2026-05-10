-- ============================================================
-- Migration 08: Household grocery shopping list
-- ============================================================
-- Adds a per-household shopping list. Items are added by either
-- partner; checking one off awards coins (default 3) to the
-- household and counts toward that day's streak. Rows persist
-- after being checked so completion history feeds the coin
-- balance and the streak engine — only the UI hides them once
-- they're not "today" anymore.
-- ============================================================

create table if not exists public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz default now(),
  bought_at date,
  bought_by uuid references public.profiles(id) on delete set null,
  reward smallint not null default 3
);

alter table public.grocery_items
  drop constraint if exists grocery_items_reward_range,
  add constraint grocery_items_reward_range
    check (reward >= 0 and reward <= 100);

alter table public.grocery_items enable row level security;

-- RLS: members of a household see / manage that household's list.
drop policy if exists "Users can view own household grocery items" on public.grocery_items;
create policy "Users can view own household grocery items"
  on public.grocery_items for select
  using (household_id in (select household_id from public.profiles where id = auth.uid()));

drop policy if exists "Users can insert own household grocery items" on public.grocery_items;
create policy "Users can insert own household grocery items"
  on public.grocery_items for insert
  with check (household_id in (select household_id from public.profiles where id = auth.uid()));

drop policy if exists "Users can update own household grocery items" on public.grocery_items;
create policy "Users can update own household grocery items"
  on public.grocery_items for update
  using (household_id in (select household_id from public.profiles where id = auth.uid()));

drop policy if exists "Users can delete own household grocery items" on public.grocery_items;
create policy "Users can delete own household grocery items"
  on public.grocery_items for delete
  using (household_id in (select household_id from public.profiles where id = auth.uid()));

create index if not exists grocery_items_household_idx on public.grocery_items(household_id);
create index if not exists grocery_items_bought_at_idx on public.grocery_items(bought_at);

-- PostgREST needs a kick to notice the new table.
notify pgrst, 'reload schema';
