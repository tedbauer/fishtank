-- ============================================================
-- ChoreTracker Supabase Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- ============================================================

-- 1. Households
create table public.households (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
  created_at timestamptz default now()
);

alter table public.households enable row level security;

-- 2. Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  color text default '#7F77DD',
  household_id uuid references public.households(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- 3. Chores
create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  freq text not null default 'weekly',
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.chores enable row level security;

-- 4. Completions
create table public.completions (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_date date not null default current_date,
  created_at timestamptz default now()
);

alter table public.completions enable row level security;

-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Households: users can see/manage their own household
create policy "Users can view own household"
  on public.households for select
  using (id in (select household_id from public.profiles where id = auth.uid()));

create policy "Authenticated users can create households"
  on public.households for insert
  with check (auth.uid() is not null);

-- Profiles: users can see household members, update own profile
create policy "Users can view household members"
  on public.profiles for select
  using (
    household_id in (select household_id from public.profiles where id = auth.uid())
    or id = auth.uid()
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- Chores: household members can CRUD
create policy "Household members can view chores"
  on public.chores for select
  using (household_id in (select household_id from public.profiles where id = auth.uid()));

create policy "Household members can create chores"
  on public.chores for insert
  with check (household_id in (select household_id from public.profiles where id = auth.uid()));

create policy "Household members can update chores"
  on public.chores for update
  using (household_id in (select household_id from public.profiles where id = auth.uid()));

create policy "Household members can delete chores"
  on public.chores for delete
  using (household_id in (select household_id from public.profiles where id = auth.uid()));

-- Completions: household members can CRUD
create policy "Household members can view completions"
  on public.completions for select
  using (chore_id in (
    select id from public.chores where household_id in (
      select household_id from public.profiles where id = auth.uid()
    )
  ));

create policy "Household members can create completions"
  on public.completions for insert
  with check (user_id = auth.uid());

create policy "Household members can delete completions"
  on public.completions for delete
  using (chore_id in (
    select id from public.chores where household_id in (
      select household_id from public.profiles where id = auth.uid()
    )
  ));

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'User'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Enable Realtime on completions table
-- ============================================================
alter publication supabase_realtime add table public.completions;
