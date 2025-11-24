-- Create the storage bucket 'avatars' if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- Drop existing policies to avoid conflicts (optional, but safer for re-running)
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload their own avatar" on storage.objects;
drop policy if exists "Authenticated users can update their own avatar" on storage.objects;
drop policy if exists "Authenticated users can delete their own avatar" on storage.objects;

-- Policy: Allow public read access to avatars
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload their own avatar
-- We check if the file path starts with the user's ID (folder structure: user_id/filename)
create policy "Authenticated users can upload their own avatar"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

-- Policy: Allow users to update their own avatar
create policy "Authenticated users can update their own avatar"
on storage.objects for update
to authenticated
using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

-- Policy: Allow users to delete their own avatar
create policy "Authenticated users can delete their own avatar"
on storage.objects for delete
to authenticated
using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
