-- ============================================================
-- ChoreTracker Profile Picture Migration (run after migration 04)
-- Adds support for choosing a tank critter or uploading a custom
-- image as your profile picture.
--
-- Display rules (handled in app code):
--   1. profile_critter set  -> render /tank/<id>.png
--   2. avatar_url set       -> render that URL (uploaded image or
--                              the OAuth photo originally seeded by
--                              handle_new_user())
--   3. otherwise            -> initial-in-colored-circle fallback
-- ============================================================

alter table public.profiles
  add column if not exists profile_critter text;

-- ============================================================
-- Avatar uploads bucket (Supabase Storage)
-- Public-read so household members can see each other's pictures
-- without signed URL juggling. Files are namespaced per-user.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can read public avatars
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can upload to their own folder: avatars/<auth.uid()>/...
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
