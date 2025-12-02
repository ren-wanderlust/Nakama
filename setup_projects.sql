-- Create projects table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.projects enable row level security;

-- Policies
create policy "Projects are viewable by everyone"
  on public.projects for select
  using ( true );

create policy "Users can insert their own projects"
  on public.projects for insert
  with check ( auth.uid() = owner_id );

create policy "Users can update their own projects"
  on public.projects for update
  using ( auth.uid() = owner_id );

create policy "Users can delete their own projects"
  on public.projects for delete
  using ( auth.uid() = owner_id );

-- Storage for project images
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

create policy "Project images are viewable by everyone"
  on storage.objects for select
  using ( bucket_id = 'project-images' );

create policy "Users can upload project images"
  on storage.objects for insert
  with check ( bucket_id = 'project-images' and auth.uid() = owner );
