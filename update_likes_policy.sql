-- Update RLS policy for likes table to allow deleting received likes
-- This allows a user to "unmatch" by deleting the like sent by the partner as well.

-- First, drop the existing delete policy if it exists (name might vary, so we try common names or just create a new one that overlaps)
-- It's safer to drop specific known policies or just add a new permissive one if the old one was restrictive.
-- Assuming standard policy name "Users can delete own likes" or similar.

drop policy if exists "Users can delete own likes" on public.likes;
drop policy if exists "Users can delete their own likes" on public.likes;
drop policy if exists "Enable delete for users based on user_id" on public.likes;

-- Create a comprehensive delete policy
create policy "Users can delete likes involved in"
on public.likes for delete
using (auth.uid() = sender_id or auth.uid() = receiver_id);
