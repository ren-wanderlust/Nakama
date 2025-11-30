-- Function to delete the current user's account data
-- This function deletes all data associated with the user in the public schema.
-- Note: This does not delete the user from auth.users, but effectively removes them from the application.

create or replace function delete_account()
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  -- Delete from theme_participants
  delete from public.theme_participants where user_id = current_user_id;

  -- Delete from likes (sent and received)
  delete from public.likes where sender_id = current_user_id or receiver_id = current_user_id;

  -- Delete from messages (sent and received)
  delete from public.messages where sender_id = current_user_id or receiver_id = current_user_id;

  -- Delete from profiles
  delete from public.profiles where id = current_user_id;

end;
$$;
