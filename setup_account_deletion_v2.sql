-- Function to allow a user to delete their own account
-- This completely removes the user from auth.users and all related data in public tables

-- First, ensure we have a function that can delete from auth.users
-- This requires high privileges, so we define it with SECURITY DEFINER
create or replace function delete_own_account()
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Delete data from public tables (handled by ON DELETE CASCADE usually, but good to be explicit for safety)
  
  -- Delete messages sent by user (received messages might be kept for the other user, or deleted depending on policy. Here we delete sent messages)
  delete from public.messages where sender_id = current_user_id;
  -- Note: We generally don't delete received messages to preserve history for the sender, but if required:
  -- delete from public.messages where receiver_id = current_user_id;

  -- Delete likes
  delete from public.likes where sender_id = current_user_id;
  delete from public.likes where receiver_id = current_user_id;

  -- Delete blocks
  delete from public.blocks where blocker_id = current_user_id;
  delete from public.blocks where blocked_id = current_user_id;

  -- Delete reports
  delete from public.reports where reporter_id = current_user_id;
  -- delete from public.reports where reported_id = current_user_id; -- Keep reports against this user for audit

  -- Delete project applications
  delete from public.project_applications where applicant_id = current_user_id;

  -- Delete theme participants
  delete from public.theme_participants where user_id = current_user_id;

  -- Delete projects owned by user (CASCADE will likely handle applications, but explicit is fine)
  delete from public.projects where owner_id = current_user_id;

  -- Delete notifications
  delete from public.push_tokens where user_id = current_user_id;

  -- Finally delete profile
  delete from public.profiles where id = current_user_id;

  -- 2. Delete the user from auth.users
  -- This is the critical part for complete account deletion
  delete from auth.users where id = current_user_id;
end;
$$;
