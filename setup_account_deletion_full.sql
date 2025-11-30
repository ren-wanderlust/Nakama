-- Function to delete the current user's account data AND auth user
-- This requires the supabase_admin role or similar privileges to delete from auth.users.
-- However, standard postgres functions cannot easily delete from auth.users due to permissions.
-- The recommended approach in Supabase is to use the Supabase Management API (Edge Functions) for user deletion.
-- BUT, for a pure SQL approach within Supabase (if Service Role key is not used in client), 
-- we can try to use a security definer function that has access to auth schema, 
-- but usually auth.users deletion is restricted even for postgres role.

-- WORKAROUND:
-- We will create a function that deletes from public tables AND attempts to delete from auth.users.
-- Note: Direct deletion from auth.users via SQL function called by a user is often blocked for security.
-- If this fails, the robust solution is Supabase Edge Functions with Service Role Key.

-- Let's try to create a function that runs as a superuser/admin if possible, or instruct the user to run this SQL in the dashboard.

create or replace function delete_account()
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  -- 1. Delete from public tables (Application Data)
  delete from public.theme_participants where user_id = current_user_id;
  delete from public.likes where sender_id = current_user_id or receiver_id = current_user_id;
  delete from public.messages where sender_id = current_user_id or receiver_id = current_user_id;
  delete from public.notifications where user_id = current_user_id or sender_id = current_user_id;
  delete from public.profiles where id = current_user_id;

  -- 2. Delete from auth.users (Authentication Data)
  -- IMPORTANT: This line requires the function to be executed with sufficient privileges.
  -- 'security definer' allows it to run with the privileges of the creator (you, the admin).
  delete from auth.users where id = current_user_id;

end;
$$;

-- Grant execute permission to authenticated users
grant execute on function delete_account() to authenticated;
