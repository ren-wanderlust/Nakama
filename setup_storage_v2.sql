-- Create the storage bucket 'avatars' if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy: Allow public read access to avatars
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public Access'
  ) then
    create policy "Public Access"
    on storage.objects for select
    using ( bucket_id = 'avatars' );
  end if;
end $$;

-- Policy: Allow authenticated users to upload their own avatar
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated users can upload their own avatar'
  ) then
    create policy "Authenticated users can upload their own avatar"
    on storage.objects for insert
    to authenticated
    with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
  end if;
end $$;

-- Policy: Allow users to update their own avatar
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated users can update their own avatar'
  ) then
    create policy "Authenticated users can update their own avatar"
    on storage.objects for update
    to authenticated
    using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
  end if;
end $$;

-- Policy: Allow users to delete their own avatar
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated users can delete their own avatar'
  ) then
    create policy "Authenticated users can delete their own avatar"
    on storage.objects for delete
    to authenticated
    using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
  end if;
end $$;
