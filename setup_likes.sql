-- Create likes table if it doesn't exist
create table if not exists public.likes (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(sender_id, receiver_id)
);

-- Enable RLS
alter table public.likes enable row level security;

-- Policies
create policy "Users can see likes they sent"
  on public.likes for select
  using (auth.uid() = sender_id);

create policy "Users can see likes they received"
  on public.likes for select
  using (auth.uid() = receiver_id);

create policy "Users can create likes"
  on public.likes for insert
  with check (auth.uid() = sender_id);

create policy "Users can delete their own likes"
  on public.likes for delete
  using (auth.uid() = sender_id);

-- Realtime
alter publication supabase_realtime add table public.likes;
