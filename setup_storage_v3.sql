-- Drop existing policies to avoid conflicts
drop policy if exists "Authenticated users can upload their own avatar" on storage.objects;
drop policy if exists "Authenticated users can update their own avatar" on storage.objects;
drop policy if exists "Authenticated users can delete their own avatar" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Authenticated users can update avatars" on storage.objects;
drop policy if exists "Authenticated users can delete avatars" on storage.objects;

-- Create bucket if not exists
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy: Allow public read access
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- Policy: Allow ANY authenticated user to upload (simplified for debugging)
create policy "Authenticated users can upload avatars"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' );

-- Policy: Allow ANY authenticated user to update (simplified)
create policy "Authenticated users can update avatars"
on storage.objects for update
to authenticated
using ( bucket_id = 'avatars' );

-- Policy: Allow ANY authenticated user to delete (simplified)
create policy "Authenticated users can delete avatars"
on storage.objects for delete
to authenticated
using ( bucket_id = 'avatars' );
