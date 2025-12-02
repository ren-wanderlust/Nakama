-- Add deadline to projects table
alter table public.projects add column if not exists deadline timestamp with time zone;

-- Create project_applications table
create table if not exists public.project_applications (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, user_id)
);

-- Enable RLS
alter table public.project_applications enable row level security;

-- Policies
create policy "Applications are viewable by everyone"
  on public.project_applications for select
  using ( true );

create policy "Users can create applications"
  on public.project_applications for insert
  with check ( auth.uid() = user_id );

create policy "Project owners can update applications"
  on public.project_applications for update
  using ( exists (
    select 1 from public.projects
    where id = project_applications.project_id
    and owner_id = auth.uid()
  ));

create policy "Users can delete their own applications"
  on public.project_applications for delete
  using ( auth.uid() = user_id );
